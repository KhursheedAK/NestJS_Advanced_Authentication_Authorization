import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from 'src/dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  getProfile(user: User) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch {
      throw new InternalServerErrorException('Failed to retrieve profile');
    }
  }

  async updateProfile(
    user: User,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    try {
      // ← ONLY THIS BLOCK CHANGED
      // build clean update object
      const updateData: Partial<User> = {};

      if (dto.username) updateData.username = dto.username;
      if (dto.email) updateData.email = dto.email;
      if (dto.profilePicture) updateData.profilePicture = dto.profilePicture;

      // handle password change
      if (dto.newPassword) {
        if (!dto.currentPassword) {
          throw new BadRequestException(
            'Current password is required to set a new password',
          );
        }

        const isValid = await bcrypt.compare(
          dto.currentPassword,
          user.password,
        );
        if (!isValid) {
          throw new BadRequestException('Current password is incorrect');
        }

        updateData.password = await bcrypt.hash(dto.newPassword, 10);
      }

      // ← END OF CHANGED BLOCK

      // Build profile picture URL if new file was uploaded
      if (file) {
        const appURI = this.configService.get<string>('APP_URL');
        updateData.profilePicture = `${appURI}/uploads/${file.filename}`;
      }

      // Update user in database
      const updatedUser = await this.usersService.update(user.id, updateData);

      // Return updated user without password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...result } = updatedUser;
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to update profile');
    }
  }
}
