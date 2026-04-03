import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';

@Module({
  imports: [UsersModule, ActivityLogModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
