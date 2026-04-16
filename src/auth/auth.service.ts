import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterDTO } from 'src/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDTO } from 'src/dto/login.dto';
import { saveFileToDisk } from '../multerConfig/multerConfig';
import { unlink } from 'fs/promises';
import { EmailService } from 'src/email/email.service';
import { randomBytes } from 'crypto';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
import { ActivityActionEnum } from 'src/activity-log/activityAction.enum';
import { generateSecret, verify, generateURI } from 'otplib';
import * as QRCode from 'qrcode';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly activityLogService: ActivityLogService, // ← new
  ) {
    // inject ConfigService
  } // dependency injection

  // Hash Password of User Registering
  private saltRounds = 10;
  // generates a random token
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // does log USER_REGISTER
  async register(dto: RegisterDTO, file?: Express.Multer.File) {
    let savedFilename: string | undefined;
    try {
      // Step 1: Hash the Password
      const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

      const appURI = this.configService.get<string>('APP_URL');

      // Step 1.1: Build profile picture URL if file was uploaded
      // only save file to disk AFTER validation passes
      let profilePicture: string | undefined;
      if (file) {
        savedFilename = await saveFileToDisk(file); // ← track filename
        profilePicture = `${appURI}/uploads/${savedFilename}`;
      }

      // generate verification token and expiry
      const verificationToken = this.generateToken();
      const verificationTokenExpiry = new Date(
        Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      );

      // Step 2: Create the User
      const user = await this.usersService.create({
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        profilePicture,
        verificationToken,
        verificationTokenExpiry,
        isVerified: false,
      });

      // send verification email
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );

      // log registration
      await this.activityLogService.log(
        ActivityActionEnum.USER_REGISTER,
        user.id,
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      /*const {password, verificationToken: _token,
        verificationTokenExpiry: _expiry,
        resetToken: _resetToken,
          resetTokenExpiry: _resetExpiry,
          twoFactorSecret: _secret, ...result} = user 
      */
      return {
        ...result,
        message: 'Registration successful. Please verify your email.',
      };
    } catch (error) {
      // delete file if DB save failed
      if (savedFilename) {
        await unlink(`./uploads/${savedFilename}`).catch(() => null);
      }
      if (error instanceof BadRequestException) throw error;
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Registration failed');
    }
  }

  // does log EMAIL_VERIFIED
  async verifyEmail(token: string) {
    try {
      // Step 1: find user by token
      const user = await this.usersService.findByVerificationToken(token);
      if (!user) {
        throw new BadRequestException('Invalid verification token');
      }

      // Step 2: check if token is expired
      if (
        !user.verificationTokenExpiry ||
        user.verificationTokenExpiry < new Date()
      ) {
        throw new BadRequestException(
          'Verification token expired. Please request a new one.',
        );
      }

      // Step 3: check if already verified
      if (user.isVerified) {
        throw new BadRequestException('Email already verified');
      }

      // Step 4: mark as verified and clear token
      await this.usersService.updateVerification(user.id, {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      });

      // log email verification
      await this.activityLogService.log(
        ActivityActionEnum.EMAIL_VERIFIED,
        user.id,
      );

      return { message: 'Email verified successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Email verification failed');
    }
  }

  async resendVerification(email: string) {
    try {
      // Step 1: find user by email
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Step 2: check if already verified
      if (user.isVerified) {
        throw new BadRequestException('Email already verified');
      }

      // Step 3: generate new token and expiry
      const verificationToken = this.generateToken();
      const verificationTokenExpiry = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      );

      // Step 4: update token in DB
      await this.usersService.updateVerification(user.id, {
        verificationToken,
        verificationTokenExpiry,
      });

      // Step 5: send new email
      await this.emailService.sendVerificationEmail(email, verificationToken);

      return { message: 'Verification email resent successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Failed to resend verification email',
      );
    }
  }

  // does log LOGIN_FAILED (!user, !isPasswordValid) | USER_LOGIN
  async login(dto: LoginDTO, ipAddress?: string) {
    try {
      // Step 1: Find user by email
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        // log failed login — no userId since user doesn't exist
        await this.activityLogService.log(
          ActivityActionEnum.LOGIN_FAILED,
          undefined,
          ipAddress,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // 1.1: check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        const minutesLeft = Math.ceil(
          (user.lockUntil.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Account locked. Try again in ${minutesLeft} minute(s)`,
        );
      }

      // Step 2: Compare password with stored hash
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        // increment login attempts
        const attempts = (user.loginAttempts || 0) + 1;

        if (attempts >= 5) {
          // lock account for 15 minutes
          await this.usersService.update(user.id, {
            loginAttempts: attempts,
            lockUntil: new Date(Date.now() + 15 * 60 * 1000),
          });
          throw new UnauthorizedException(
            'Too many failed attempts. Account locked for 15 minutes.',
          );
        }

        await this.usersService.update(user.id, { loginAttempts: attempts });

        // log failed login — we have userId this time
        await this.activityLogService.log(
          ActivityActionEnum.LOGIN_FAILED,
          user.id,
          ipAddress,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // reset login attempts on success
      await this.usersService.update(user.id, {
        loginAttempts: 0,
        lockUntil: null,
      });

      // check if email is verified
      if (!user.isVerified) {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }

      // if 2FA enabled → don't return JWT yet
      if (user.isTwoFactorEnabled) {
        return {
          requires2FA: true,
          userId: user.id,
          message: 'Please enter your 2FA code',
        };
      }

      // Step 3: Build the payload
      const payload = {
        email: user.email,
        id: user.id,
        username: user.username,
      };

      // Step 4: Generate and return the token
      const token = this.jwtService.sign(payload);

      // log successful login
      await this.activityLogService.log(
        ActivityActionEnum.USER_LOGIN,
        user.id,
        ipAddress,
      );

      return {
        access_token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Login failed');
    }
  }

  async forgotPassword(email: string) {
    try {
      // Step 1: find user by email
      const user = await this.usersService.findByEmail(email);

      // Step 2: if user not found, still return success
      // reason: never reveal if email exists in DB
      if (!user) {
        return {
          message: 'If that email exists, a reset link has been sent',
        };
      }

      // Step 3: check if email is verified
      if (!user.isVerified) {
        throw new BadRequestException(
          'Please verify your email before resetting your password',
        );
      }

      // Step 4: generate reset token and expiry
      const resetToken = this.generateToken();
      const resetTokenExpiry = new Date(
        Date.now() + 60 * 60 * 1000, // 1 hour from now
      );

      // Step 5: save token to DB
      await this.usersService.update(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Step 6: send reset email
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);

      return {
        message: 'If that email exists, a reset link has been sent',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Failed to process password reset request',
      );
    }
  }

  async verifyResetToken(token: string) {
    try {
      // Step 1: find user by token
      const user = await this.usersService.findByResetToken(token);
      if (!user) {
        throw new BadRequestException('Invalid reset token');
      }

      // Step 2: check expiry
      if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new BadRequestException(
          'Reset token expired. Please request a new one.',
        );
      }

      return { message: 'Token is valid. You can now reset your password.' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to verify reset token');
    }
  }

  // does log PASSWORD_RESET
  async resetPassword(token: string, newPassword: string) {
    try {
      // Step 1: find user by token
      const user = await this.usersService.findByResetToken(token);
      if (!user) {
        throw new BadRequestException('Invalid reset token');
      }

      // Step 2: check expiry
      if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new BadRequestException(
          'Reset token expired. Please request a new one.',
        );
      }

      // Step 3: hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

      // Step 4: update password and clear reset token
      await this.usersService.update(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      // log password reset
      await this.activityLogService.log(
        ActivityActionEnum.PASSWORD_RESET,
        user.id,
      );

      return { message: 'Password reset successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  /*
    2FA Methods
  */

  // Method: 1
  async setup2FA(userId: number) {
    try {
      const user = await this.usersService.findById(userId);

      // generate secret
      const secret = generateSecret();

      // build QR code URL
      const otpauthUrl = generateURI({
        issuer: 'PSEB-Task',
        label: user.email,
        secret,
      });

      // save secret to DB (not enabled yet)
      await this.usersService.update2FA(userId, secret, false);

      // generate QR code
      const qrCode = await QRCode.toDataURL(otpauthUrl);

      return { secret, qrCode };
    } catch (error) {
      console.error('2FA Setup Error:', error); // ← add this
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to setup 2FA');
    }
  }

  // Method: 2
  async enable2FA(userId: number, code: string) {
    try {
      const user = await this.usersService.findById(userId);

      if (!user.twoFactorSecret) {
        throw new BadRequestException(
          '2FA setup not initiated. Please setup first.',
        );
      }

      if (user.isTwoFactorEnabled) {
        throw new BadRequestException('2FA is already enabled');
      }

      const result = await verify({
        secret: user.twoFactorSecret,
        token: code,
      });

      if (!result.valid) {
        throw new BadRequestException('Invalid 2FA code');
      }

      await this.usersService.update2FA(userId, user.twoFactorSecret, true);

      return { message: '2FA enabled successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to enable 2FA');
    }
  }
  // Method: 3
  async verify2FA(userId: number, code: string) {
    try {
      const user = await this.usersService.findById(userId);

      if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new BadRequestException('2FA is not enabled');
      }

      const result = await verify({
        secret: user.twoFactorSecret,
        token: code,
      });

      if (!result.valid) {
        throw new BadRequestException('Invalid 2FA code');
      }

      // generate JWT after successful 2FA
      const payload = {
        id: user.id,
        email: user.email,
        username: user.username,
      };

      const token = this.jwtService.sign(payload);

      await this.activityLogService.log(ActivityActionEnum.USER_LOGIN, user.id);

      return {
        access_token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to verify 2FA');
    }
  }
  // Method: 4
  async disable2FA(userId: number, code: string) {
    try {
      const user = await this.usersService.findById(userId);

      if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new BadRequestException('2FA is not enabled');
      }

      const result = await verify({
        secret: user.twoFactorSecret,
        token: code,
      });

      if (!result.valid) {
        throw new BadRequestException('Invalid 2FA code');
      }

      await this.usersService.update2FA(userId, null, false);

      return { message: '2FA disabled successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to disable 2FA');
    }
  }
}
