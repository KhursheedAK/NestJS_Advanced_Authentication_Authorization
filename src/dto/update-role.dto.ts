import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from '../users/role.enum';

export class UpdateRoleDto {
  @ApiProperty({ enum: RoleEnum, example: RoleEnum.MODERATOR })
  @IsEnum(RoleEnum)
  role!: RoleEnum;
}
