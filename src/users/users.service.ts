import {
  Injectable,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // 1 ** Check Existing Email **
  // Check existing users against email address in the database before registering
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOneBy({ email });
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
      const user = await this.usersRepository.findOneBy({ id });
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

  // 5 ** Get all users — for admin panel
  async findAll(): Promise<User[]> {
    try {
      return await this.usersRepository.find();
    } catch {
      throw new InternalServerErrorException(
        'Database error while fetching users',
      );
    }
  }

  // 6 ** Delete user by id — for admin panel
  async delete(id: number): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const user = await this.findById(id);

      // delete profile picture from disk if exists
      if (user.profilePicture) {
        const filename = user.profilePicture.split('/uploads/')[1];
        await unlink(join(process.cwd(), 'uploads', filename)).catch(
          () => null,
        );
      }

      await this.usersRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Database error while deleting user',
      );
    }
  }

  // 7 ** find user by verification token
  async findByVerificationToken(token: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOneBy({ verificationToken: token });
    } catch {
      throw new InternalServerErrorException('Database error');
    }
  }

  // 8 ** update verification fields
  async updateVerification(id: number, data: Partial<User>): Promise<User> {
    try {
      await this.usersRepository.update(id, data);
      return await this.findById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error');
    }
  }
}
