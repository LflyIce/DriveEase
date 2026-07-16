import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RbacService } from './rbac.service';

/**
 * 角色权限管理 API。整模块需 rbac:manage 权限（管理员超级角色短路放行），
 * 普通角色即便拿到 token 调这里也会 403 → 本模块对非管理员彻底不可用。
 */
@ApiTags('rbac')
@Controller()
@RequirePermissions('rbac:manage')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('permissions')
  @ApiOperation({ summary: '权限列表（只读，前端按 type/module 分组渲染勾选）' })
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Get('roles')
  @ApiOperation({ summary: '角色列表（含每角色权限码集，用于回显）' })
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Post('roles')
  @HttpCode(200)
  @ApiOperation({ summary: '新建角色（不可建内置角色）' })
  create(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: '编辑角色（仅名称/描述，code/内置不可改）' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: '删除角色（内置角色禁删）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deleteRole(id);
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: '全量覆盖某角色的权限码' })
  setPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.rbacService.setRolePermissions(id, dto.codes);
  }
}
