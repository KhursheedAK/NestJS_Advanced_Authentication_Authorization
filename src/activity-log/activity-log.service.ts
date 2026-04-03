import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { ActivityActionEnum } from './activityAction.enum';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
  ) {}

  async log(
    action: ActivityActionEnum,
    userId?: number,
    ipAddress?: string,
    metadata?: Record<string, unknown>, // ← new
  ): Promise<void> {
    try {
      const logEntry = this.activityLogRepository.create({
        action,
        userId,
        ipAddress,
        metadata, // ← new
      });
      await this.activityLogRepository.save(logEntry);
    } catch {
      // never throw — logging should never break the main flow
      console.error('Failed to save activity log');
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ActivityLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const [data, total] = await this.activityLogRepository.findAndCount({
        order: { timestamp: 'DESC' }, // newest first
        skip: (page - 1) * limit, // pagination offset
        take: limit, // how many per page
      });

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      throw new InternalServerErrorException('Failed to fetch activity logs');
    }
  }

  async findByUserId(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ActivityLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const [data, total] = await this.activityLogRepository.findAndCount({
        where: { userId },
        order: { timestamp: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to fetch user activity logs',
      );
    }
  }
}
