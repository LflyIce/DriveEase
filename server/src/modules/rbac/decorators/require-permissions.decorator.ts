import { SetMetadata } from '@nestjs/common';

/** 元数据 key：标记接口所需的权限码集合 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * 标注接口所需的权限码（一个或多个，需全部满足）。
 * 由 PermissionGuard 读取校验；管理员（roleCode='admin'）短路放行。
 * 未标注的接口只需登录（JwtAuthGuard 已保证）。
 */
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
