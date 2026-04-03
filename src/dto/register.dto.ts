import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDTO {
  @ApiProperty({ example: 'KhursheedAK' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(8, { message: 'Password must be at-least 8 characters long' })
  password!: string;

  @ApiProperty({ example: 'khursheed@new.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167',
    required: false,
  })
  @IsString()
  @IsOptional()
  profilePicture?: string;
}
