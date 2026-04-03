import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ActivityActionEnum } from './activityAction.enum';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  userId?: number;

  @Column({
    type: 'enum',
    enum: ActivityActionEnum,
  })
  action!: ActivityActionEnum;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: Record<string, unknown> | null; // ← new

  @CreateDateColumn()
  timestamp!: Date;
}
