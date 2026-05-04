import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
import { ActivityActionEnum } from 'src/activity-log/activityAction.enum';
import { RoleEnum } from './role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly activityLogService: ActivityLogService, // ← new
  ) {}

  // 1 ** Check Existing Email **
  // Check existing users against email address in the database before registering
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOneBy({
        email,
        isDeleted: false, // exclude deleted
      });
    } catch {
      throw new InternalServerErrorException(
        'Database error while finding user',
      );
    }
  }

  // 2 ** Registration **
  // Used by AuthService to register/save (create) a new user
  async create(data: Partial<User>): Promise<User> {
    try {
      // Check for duplicate email or username
      const existing = await this.usersRepository.findOneBy({
        email: data.email,
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }

      const user = this.usersRepository.create(data); // creates instance (doesn't save yet)
      return this.usersRepository.save(user); // actually saves to DB
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        'Database error while creating user',
      );
    }
  }

  // 3 ** finding a user by the ID **
  async findById(id: number): Promise<User> {
    try {
      const user = await this.usersRepository.findOneBy({
        id,
        isDeleted: false, // exclude deleted
      });
      if (!user) {
        throw new NotFoundException('User not Found');
      }
      return user;
    } catch (error) {
      // if we threw NotFoundException above, rethrow it as is
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while finding user',
      );
    }
  }

  // 4 ** Updating existing user **
  async update(id: number, data: Partial<User>): Promise<User> {
    try {
      await this.usersRepository.update(id, data);
      return this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while updating user',
      );
    }
  }

  // 5 ** find user by verification token
  async findByVerificationToken(token: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOneBy({ verificationToken: token });
    } catch {
      throw new InternalServerErrorException('Database error');
    }
  }

  // 6 ** update verification fields
  async updateVerification(id: number, data: Partial<User>): Promise<User> {
    try {
      await this.usersRepository.update(id, data);
      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }

  // 7 ** find user by reset token for password-reset
  async findByResetToken(token: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOneBy({ resetToken: token });
    } catch {
      throw new InternalServerErrorException(
        'Database error while finding user',
      );
    }
  }

  // 8 ** Update 2FA settings
  async update2FA(
    id: number,
    secret: string | null,
    isEnabled: boolean,
  ): Promise<User> {
    try {
      await this.usersRepository.update(id, {
        twoFactorSecret: secret,
        isTwoFactorEnabled: isEnabled,
      });
      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while updating 2FA',
      );
    }
  }

  /* Admin related services */

  // 9 ** Get all users — for admin panel
  async findAll(): Promise<User[]> {
    try {
      return await this.usersRepository.find({
        where: { isDeleted: false }, // exclude deleted
      });
    } catch {
      throw new InternalServerErrorException(
        'Database error while fetching users',
      );
    }
  }

  // 10 ** Delete user by id — for admin panel
  async delete(id: number, adminId?: number): Promise<void> {
    try {
      const user = await this.findById(id);

      // soft delete — mark as deleted instead of removing
      await this.usersRepository.update(id, {
        isDeleted: true,
        deletedAt: new Date(),
      });

      // log after soft deletion
      await this.activityLogService.log(
        ActivityActionEnum.ADMIN_DELETED_USER,
        adminId, // ← who performed the deletion
        undefined,
        { deletedUserId: id, deletedUsername: user.username }, // ← metadata
      );
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while deleting user',
      );
    }
  }

  // 11 ** Get all deleted users — admin only
  async findAllDeleted(): Promise<User[]> {
    try {
      return await this.usersRepository.find({
        where: { isDeleted: true },
      });
    } catch {
      throw new InternalServerErrorException(
        'Database error while fetching deleted users',
      );
    }
  }

  // 12 ** Restore a soft deleted user — admin only
  async restore(id: number, adminId?: number): Promise<User> {
    try {
      const user = await this.usersRepository.findOneBy({
        id,
        isDeleted: true,
      });
      if (!user) {
        throw new NotFoundException('Deleted user not found');
      }

      await this.usersRepository.update(id, {
        isDeleted: false,
        deletedAt: null,
      });

      // log after restoring deleted user
      await this.activityLogService.log(
        ActivityActionEnum.ADMIN_RESTORED_USER,
        adminId, // ← who performed the restoration
        undefined,
        { restoredUserId: id, restoredUsername: user.username }, // ← metadata
      );

      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while restoring user',
      );
    }
  }

  // 13 ** update user role — admin only
  async updateRole(
    id: number,
    role: RoleEnum,
    adminId?: number,
  ): Promise<User> {
    try {
      await this.findById(id);
      await this.usersRepository.update(id, { role });

      await this.activityLogService.log(
        ActivityActionEnum.ADMIN_UPDATED_ROLE,
        adminId,
        undefined,
        { targetUserId: id, newRole: role },
      );

      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while updating role',
      );
    }
  }

  // 14 ** update user status — admin only
  async updateStatus(
    id: number,
    isActive: boolean,
    adminId?: number,
  ): Promise<User> {
    try {
      await this.findById(id);
      await this.usersRepository.update(id, { isActive });

      await this.activityLogService.log(
        ActivityActionEnum.ADMIN_UPDATED_STATUS,
        adminId,
        undefined,
        { targetUserId: id, newStatus: isActive },
      );

      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while updating status',
      );
    }
  }
  /* End of Admin related services */
}
