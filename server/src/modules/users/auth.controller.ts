import { Controller, Get, Request } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RbacService } from '../rbac/rbac.service';
import { UsersService } from './users.service';

/**
 * /auth/me：返回当前登录用户 + roleCode + 权限码集。
 * 前端登录后用它取 accessCodes（菜单/按钮过滤）与真实用户信息。
 * 非 @Public（需登录），但未标 @RequirePermissions（登录即可，权限码本身是公开给前端的）。
 * 管理员返回全部权限码，让其菜单/按钮全显。
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rbacService: RbacService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '当前登录用户信息 + 权限码集' })
  async me(@Request() req: any) {
    const userId: number = req.user.userId;
    const roleCode: string | null = req.user.roleCode;
    const user = await this.usersService.findOneOrFail(userId);
    const permissions =
      roleCode === 'admin'
        ? await this.rbacService.listAllPermissionCodes()
        : await this.rbacService.getPermissionCodesByRoleId(user.roleId ?? null);
    return { ...user, roleCode, permissions };
  }
}
