import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  // send verification email
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationLink = `${appUrl}/auth/verify-email/${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'Verify Your Email',
        html: `
          <h1>Email Verification</h1>
          <p>Thank you for registering. Please verify your email by clicking the link below:</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>This link expires in 24 hours.</p>
          <p>If you did not register, please ignore this email.</p>
        `,
      });
    } catch {
      throw new InternalServerErrorException(
        'Failed to send verification email',
      );
    }
  }

  // send password reset email
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const resetLink = `${appUrl}/auth/reset-password/${token}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'Password Reset Request',
        html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>Your password will remain unchanged.</p>
      `,
      });
    } catch {
      throw new InternalServerErrorException(
        'Failed to send password reset email',
      );
    }
  }
}
