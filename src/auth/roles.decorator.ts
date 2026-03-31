import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../users/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);

// (...roles: Role[]) => we can pass multiple roles @Roles(RoleEnum.Admin, RoleEnum.Moderator) two roles
