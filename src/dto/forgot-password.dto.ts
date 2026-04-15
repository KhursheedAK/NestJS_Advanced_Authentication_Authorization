import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address to send password reset link to',
    example: 'tester2@tester2.com',
  })
  @IsEmail()
  email!: string;
}
