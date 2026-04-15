import {
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetLogsQueryDto } from '../dto/get-logs-query.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleEnum } from '../users/role.enum';
import { UsersService } from '../users/users.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { Request } from '@nestjs/common';
import type { RequestWithUser } from 'src/types/express';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // ← both guards on entire controller
@Roles(RoleEnum.ADMIN) // ← entire controller is admin only
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly activityLogService: ActivityLogService, // ← new
  ) {}

  // Get All Users
  @Get('users')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getAllUsers() {
    return this.usersService.findAll();
  }

  // Delete a User
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.usersService.delete(id, req.user.id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get all activity logs (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns paginated activity logs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async getLogs(@Query() query: GetLogsQueryDto) {
    const { page = 1, limit = 10, userId } = query;
    if (userId) {
      return this.activityLogService.findByUserId(userId, page, limit);
    }
    return this.activityLogService.findAll(page, limit);
  }
}
