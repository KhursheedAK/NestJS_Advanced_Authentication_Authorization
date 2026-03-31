import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleEnum } from '../users/role.enum';
import { ROLES_KEY } from './roles.decorator';
import { User } from '../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Step 1: get required roles from route metadata
    const requiredRoles = this.reflector.getAllAndOverride<RoleEnum[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Step 2: if no roles defined, route is accessible to all logged in users
    if (!requiredRoles) {
      return true;
    }

    // Step 3: get user from request
    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;

    // Step 4: check if user's role matches required roles
    return requiredRoles.includes(user.role);
  }
}
