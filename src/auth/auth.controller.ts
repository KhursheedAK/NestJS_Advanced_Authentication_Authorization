import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RegisterDTO } from 'src/dto/register.dto';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../multerConfig/multerConfig';
import { LoginDTO } from 'src/dto/login.dto';
import type { Request } from 'express';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt.guard';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Auth')
@Controller('auth') // defines the base path for auth controller. All routes start with /auth
export class AuthController {
  // dependency injection of AuthService
  constructor(private readonly authService: AuthService) {}

  // Post Method Route to Register a New User
  @Post('register') // defines the route. auth/register for POST Method
  //
  @ApiOperation({ summary: 'Register a new user' })
  @ApiConsumes('multipart/form-data') // ← tells Swagger this accepts file upload
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'tester2' },
        email: { type: 'string', example: 'tester2@tester2.com' },
        password: { type: 'string', example: 'tester2@123' },
        profilePicture: { type: 'string', format: 'binary' }, // ← file upload field
      },
      required: ['username', 'email', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, Verification email sent',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already in use' })

  // @Body() extracts the request body | And Tell Validation Pipe to check against the RegisterDTO rules | dto is the validated data
  @UseInterceptors(FileInterceptor('profilePicture', multerConfig))
  async register(
    @Body() dto: RegisterDTO,
    @UploadedFile()
    file: Express.Multer.File,
  ) {
    return this.authService.register(dto, file);
  }

  //auth/login
  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
  })
  async login(@Body() dto: LoginDTO, @Req() req: Request) {
    const ipAddress = req.ip; // ← extract IP from request
    return this.authService.login(dto, ipAddress);
  }

  // GET verify-email/:token
  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // POST resent-verification
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email resent' })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or not found',
  })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  // POST forgot-password
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'tester2@tester2.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  // GET reset-password/:token
  @Get('reset-password/:token')
  @ApiOperation({ summary: 'Verify reset token is valid' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyResetToken(@Param('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  // POST reset-password/:token
  @Post('reset-password/:token')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newPassword: { type: 'string', example: 'tester2@1234' },
      },
      required: ['newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Param('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  // 2FA Routes

  /* 2fa setup */
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Setup 2FA — generates secret and QR code' })
  @ApiResponse({ status: 200, description: 'Returns secret and QR code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setup2FA(@Req() req: RequestWithUser) {
    return this.authService.setup2FA(req.user.id);
  }

  /* 2fa enable */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA by verifying first code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '123456' },
      },
      required: ['code'],
    },
  })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code or setup not done' })
  async enable2FA(@Req() req: RequestWithUser, @Body('code') code: string) {
    return this.authService.enable2FA(req.user.id, code);
  }

  /* 2fa verify */
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA code during login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', example: 1 },
        code: { type: 'string', example: '123456' },
      },
      required: ['userId', 'code'],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns JWT token' })
  @ApiResponse({ status: 400, description: 'Invalid 2FA code' })
  async verify2FA(@Body('userId') userId: number, @Body('code') code: string) {
    return this.authService.verify2FA(userId, code);
  }

  /* 2fa disable */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '123456' },
      },
      required: ['code'],
    },
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code or 2FA not enabled' })
  async disable2FA(@Req() req: RequestWithUser, @Body('code') code: string) {
    return this.authService.disable2FA(req.user.id, code);
  }
  // End of 2fa routes
}
