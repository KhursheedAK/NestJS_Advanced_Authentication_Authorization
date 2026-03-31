import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService, // ← new
  ) {
    // inject ConfigService
  } // dependency injection

  // Hash Password of User Registering
  private saltRounds = 10;

  // generates a random token
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

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

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
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

  async login(dto: LoginDTO) {
    try {
      // Step 1: Find user by email
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Step 2: Compare password with stored hash
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // check if email is verified
      if (!user.isVerified) {
        throw new UnauthorizedException(
          'Please verify your email before logging in',
        );
      }

      // Step 3: Build the payload
      const payload = {
        email: user.email,
        id: user.id,
        username: user.username,
      };

      // Step 4: Generate and return the token
      const token = this.jwtService.sign(payload);

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
}
