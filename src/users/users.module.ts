// File 5
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ActivityLogModule], // registers the User Entity
  providers: [UsersService],
  controllers: [],
  exports: [UsersService], // for other modules (AuthModule)
})
export class UsersModule {}
