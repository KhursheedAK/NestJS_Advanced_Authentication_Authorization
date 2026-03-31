import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDTO {
  @ApiProperty({ example: 'admin@admin.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin@123', minLength: 6 })
  @IsString()
  @MinLength(8)
  password: string;
}
