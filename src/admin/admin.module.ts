import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from 'src/users/users.module';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [UsersModule, ActivityLogModule],
  controllers: [AdminController],
})
export class AdminModule {}
