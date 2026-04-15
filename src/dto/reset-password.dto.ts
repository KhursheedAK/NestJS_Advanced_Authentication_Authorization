import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'New password to set',
    example: 'tester2@1234',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
