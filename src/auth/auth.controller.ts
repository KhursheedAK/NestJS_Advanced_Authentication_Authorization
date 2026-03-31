import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { RegisterDTO } from 'src/dto/register.dto';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../multerConfig/multerConfig';
import { LoginDTO } from 'src/dto/login.dto';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

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
        username: { type: 'string', example: 'khursheed alam khan' },
        email: { type: 'string', example: 'khursheedexample@example.com' },
        password: { type: 'string', example: 'password123' },
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

  @Post('login') //auth/login
  @ApiOperation({ summary: 'Login and get JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
  })
  async login(@Body() dto: LoginDTO) {
    return this.authService.login(dto);
  }

  @Get('verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

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
}
