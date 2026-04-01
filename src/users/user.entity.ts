// File 4
// Entity class for table definition of Users
import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEnum } from './role.enum';

@Entity('users') // creates table on postgreSQL
export class User {
  @PrimaryGeneratedColumn() // creates columns in tables
  id: number;

  @Column({ unique: true, nullable: false })
  username: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ nullable: false })
  password: string; // bcrypt hashed

  @Column({ nullable: true }) // optional
  profilePicture?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: RoleEnum,
    default: RoleEnum.USER,
  })
  role: RoleEnum;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true, type: 'varchar' })
  verificationToken?: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  verificationTokenExpiry?: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  resetToken?: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  resetTokenExpiry?: Date | null;
}
