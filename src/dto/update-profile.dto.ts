import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'KhursheedAK', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    example: 'khursheed@updated.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'newpassword123', required: false, minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({
    example:
      'https://plus.unsplash.com/premium_photo-1681426472026-60d4bf7b69a1',
    required: false,
  })
  @IsOptional()
  @IsString()
  profilePicture?: string;
}
