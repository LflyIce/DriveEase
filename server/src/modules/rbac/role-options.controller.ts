import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RbacService } from './rbac.service';

/**
 * 角色下拉选项（只读）。独立于 RbacController：那边整类被 rbac:manage 拦，
 * 而「用户管理」可授予无 rbac:manage 的角色使用，其编辑表单拉角色下拉不能 403。
 * 本控制器无 @RequirePermissions → 仅需有效登录 token（与 GET /users 同级）。
 */
@ApiTags('rbac')
@Controller('roles')
export class RoleOptionsController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('options')
  @ApiOperation({ summary: '角色下拉选项 [{id,name}]（仅需登录）' })
  listOptions() {
    return this.rbacService.listRoleOptions();
  }
}
