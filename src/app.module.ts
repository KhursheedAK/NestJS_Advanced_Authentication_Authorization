// File 3
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './users/user.entity';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { AdminController } from './admin/admin.controller';
import { AdminModule } from './admin/admin.module';
import { EmailModule } from './email/email.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { ActivityLog } from './activity-log/activity-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // Loads .env file globally for all modules

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [User, ActivityLog],
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    UsersModule,
    AuthModule,
    ProfileModule,
    AdminModule,
    EmailModule,
    ActivityLogModule,
  ],
  controllers: [AdminController],
  providers: [],
})
export class AppModule {}
