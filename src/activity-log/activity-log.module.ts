import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './activity-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  providers: [ActivityLogService],
  exports: [ActivityLogService], // ← shared with AuthModule, ProfileModule, AdminModule
})
export class ActivityLogModule {}
