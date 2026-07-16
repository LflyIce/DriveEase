import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    private readonly logger: LogService,
  ) {}

  /** 取某角色的权限码集合（管理员在外部短路，这里只按 roleId 查） */
  async getPermissionCodesByRoleId(roleId: null | number): Promise<string[]> {
    if (roleId == null) return [];
    const rows = (await this.dataSource.query(
      `SELECT p.code AS code FROM permission p
        JOIN role_permission rp ON rp.permission_id = p.id
       WHERE rp.role_id = ?
       ORDER BY p.sort`,
      [roleId],
    )) as Array<{ code: string }>;
    return rows.map((r) => r.code);
  }

  /**
   * 校验当前用户是否拥有某权限码（供 controller 做"同一端点不同操作码"的动态校验，
   * 如保单状态变更：退保需 policy:surrender、激活需 policy:activate）。
   * 管理员（roleCode='admin'）短路放行。
   */
  async checkPermission(
    user:
      | { roleCode: null | string; roleId: null | number }
      | undefined,
    code: string,
  ): Promise<void> {
    if (!user) throw new ForbiddenException('无权限访问');
    if (user.roleCode === 'admin') return;
    const codes = await this.getPermissionCodesByRoleId(user.roleId);
    if (!codes.includes(code)) {
      throw new ForbiddenException('当前角色无此操作权限');
    }
  }

  /** 全部权限码（管理员 /auth/me 用，让其前端菜单/按钮全显） */
  async listAllPermissionCodes(): Promise<string[]> {
    const rows = await this.permRepo.find({ order: { sort: 'ASC' } });
    return rows.map((p) => p.code);
  }

  /** 权限列表（只读，按 type/sort） */
  async listPermissions(): Promise<Permission[]> {
    return this.permRepo.find({ order: { type: 'ASC', sort: 'ASC' } });
  }

  /** 角色列表（含每角色的权限码集合，供权限管理 UI 勾选回显） */
  async listRoles(): Promise<Array<Record<string, unknown>>> {
    const rows = (await this.dataSource.query(
      `SELECT r.id AS id, r.name AS name, r.code AS code, r.is_built_in AS is_built_in,
              r.description AS description, r.created_at AS created_at, r.updated_at AS updated_at,
              p.code AS perm_code
         FROM role r
         LEFT JOIN role_permission rp ON rp.role_id = r.id
         LEFT JOIN permission p ON p.id = rp.permission_id
        ORDER BY r.id, p.sort`,
    )) as Array<Record<string, unknown>>;
    const map = new Map<number, Record<string, unknown>>();
    for (const row of rows) {
      const id = row.id as number;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: row.name,
          code: row.code,
          isBuiltIn: row.is_built_in,
          description: row.description,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          permissions: [] as string[],
        });
      }
      if (row.perm_code) {
        (map.get(id)!.permissions as string[]).push(row.perm_code as string);
      }
    }
    return [...map.values()];
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const dup = await this.roleRepo.findOneBy({ code: dto.code });
    if (dup) throw new BadRequestException('角色编码已存在');
    const saved = await this.roleRepo.save(
      this.roleRepo.create({
        name: dto.name,
        code: dto.code,
        isBuiltIn: 0,
        description: dto.description ?? null,
      }),
    );
    this.logger.log('新增角色', dto.name);
    return saved;
  }

  async updateRole(id: number, dto: UpdateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOneBy({ id });
    if (!existing) throw new NotFoundException('角色不存在');
    await this.roleRepo.update(id, {
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
    });
    this.logger.log('编辑角色', existing.name);
    return this.roleRepo.findOneByOrFail({ id });
  }

  async deleteRole(id: number): Promise<{ message: string }> {
    const existing = await this.roleRepo.findOneBy({ id });
    if (!existing) throw new NotFoundException('角色不存在');
    if (existing.isBuiltIn === 1) throw new BadRequestException('内置角色不可删除');
    await this.dataSource.query('DELETE FROM role_permission WHERE role_id = ?', [id]);
    await this.roleRepo.delete(id);
    this.logger.log('删除角色', existing.name);
    return { message: '删除成功' };
  }

  /** 全量覆盖某角色的权限码 */
  async setRolePermissions(roleId: number, codes: string[]): Promise<{ message: string }> {
    const role = await this.roleRepo.findOneBy({ id: roleId });
    if (!role) throw new NotFoundException('角色不存在');
    const perms = codes.length
      ? await this.permRepo.find({ where: codes.map((c) => ({ code: c })) })
      : [];
    await this.dataSource.query('DELETE FROM role_permission WHERE role_id = ?', [roleId]);
    for (const p of perms) {
      await this.dataSource.query(
        'INSERT INTO role_permission (role_id, permission_id) VALUES (?, ?)',
        [roleId, p.id],
      );
    }
    this.logger.log('配置角色权限', role.name, codes.join(','));
    return { message: '保存成功' };
  }
}
