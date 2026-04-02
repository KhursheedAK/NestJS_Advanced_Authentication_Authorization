import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../multerConfig/multerConfig';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from 'src/users/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

interface RequestWithUser {
  user: User;
}

@ApiTags('Profile')
@ApiBearerAuth() // ← tells Swagger this needs JWT token
@Controller('profile')
@UseGuards(JwtAuthGuard) // ← protects ALL routes in this controller
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req: RequestWithUser) {
    return this.profileService.getProfile(req.user);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'tester2' },
        email: {
          type: 'string',
          example: 'tester2@tester2.com',
        },
        currentPassword: { type: 'string', example: 'currentpass123' },
        newPassword: { type: 'string', example: 'newpass123' },
        profilePicture: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('profilePicture', multerConfig))
  async updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.updateProfile(req.user, dto, file);
  }
}
