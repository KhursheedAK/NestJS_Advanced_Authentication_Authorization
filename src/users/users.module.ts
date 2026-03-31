// File 5
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // registers the User Entity
  providers: [UsersService],
  controllers: [],
  exports: [UsersService], // for other modules (AuthModule)
})
export class UsersModule {}
