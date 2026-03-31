import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

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
    data: Partial<User>,
    file?: Express.Multer.File,
  ) {
    try {
      // hash password if being updated
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      // Step 1: Build profile picture URL if new file was uploaded
      if (file) {
        const appURI = this.configService.get<string>('APP_URL');
        data.profilePicture = `${appURI}/uploads/${file.filename}`;
      }

      // Step 2: Update user in database
      const updatedUser = await this.usersService.update(user.id, data);

      // Step 3: Return updated user without password
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = updatedUser;
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Failed to update profile');
    }
  }
}
