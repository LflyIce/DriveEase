import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * 权限守卫（注册为 APP_GUARD，排在 JwtAuthGuard 之后）：
 * - 未标 @RequirePermissions 的接口 → 仅需登录，直接放行；
 * - 标注的接口 → 查当前用户角色的权限码集合，须包含全部所需码；
 * - 管理员（req.user.roleCode === 'admin'）短路放行（超级角色）。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as {
      roleId: null | number;
      roleCode: null | string;
    } | undefined;
    if (!user) throw new ForbiddenException('无权限访问');

    // 超级角色短路
    if (user.roleCode === 'admin') return true;

    const codes = await this.rbacService.getPermissionCodesByRoleId(user.roleId);
    const ok = required.every((c) => codes.includes(c));
    if (!ok) throw new ForbiddenException('当前角色无此操作权限');
    return true;
  }
}
