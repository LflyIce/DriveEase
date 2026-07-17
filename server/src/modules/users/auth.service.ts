import crypto from 'crypto';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './jwt.strategy';

/**
 * 认证服务：SHA-256（无盐）比对密码，登录成功签发 JWT（含 userId/username/roleId/role/roleCode）。
 * 旧数据（role_id 为空）登录时按 user.role 名自愈回填 role_id。配合全局 JwtAuthGuard + PermissionGuard。
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LogService,
    private readonly jwtService: JwtService,
  ) {}

  hashPassword(pwd: string): string {
    return crypto.createHash('sha256').update(pwd).digest('hex');
  }

  async login(dto: LoginDto) {
    const user = await this.repo.findOne({
      where: { phone: dto.phone, password: this.hashPassword(dto.password) },
    });
    if (!user) throw new UnauthorizedException('手机号或密码错误');
    if (user.status === '禁用') throw new ForbiddenException('账户已禁用');

    // 解析 roleId + roleCode；旧数据（role_id 为空）按 user.role 名自愈回填
    const { roleId, roleCode } = await this.resolveRole(user);

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      roleId,
      role: user.role,
      roleCode,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    this.logger.log('用户登录', user.username, undefined, dto.phone);
    const { password: _password, ...safe } = user;
    return { ...safe, roleId, roleCode, accessToken };
  }

  /** 读当前用户仪表盘布局（dashboard_config JSON → 数组；无/脏数据返回 null，前端回退默认布局） */
  async getDashboardConfig(userId: number) {
    const user = await this.repo.findOne({ where: { id: userId } });
    if (!user?.dashboardConfig) return null;
    try {
      const parsed = JSON.parse(user.dashboardConfig);
      return Array.isArray(parsed?.layout) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** 存当前用户仪表盘布局（controller 已用 DTO 校验结构，这里直接落 JSON） */
  async saveDashboardConfig(userId: number, layout: unknown) {
    await this.repo.update(userId, {
      dashboardConfig: JSON.stringify({ layout }),
    });
    return { layout };
  }

  /** 解析用户角色：有 role_id 则查 code；无则按 user.role 名查并自愈回填 role_id */
  private async resolveRole(user: User): Promise<{
    roleId: null | number;
    roleCode: null | string;
  }> {
    if (user.roleId != null) {
      const rows = (await this.dataSource.query(
        'SELECT code FROM role WHERE id = ?',
        [user.roleId],
      )) as Array<{ code: string }>;
      return { roleId: user.roleId, roleCode: rows[0]?.code ?? null };
    }
    if (user.role) {
      const rows = (await this.dataSource.query(
        'SELECT id, code FROM role WHERE name = ?',
        [user.role],
      )) as Array<{ code: string; id: number }>;
      if (rows[0]) {
        await this.dataSource.query(
          'UPDATE user SET role_id = ? WHERE id = ?',
          [rows[0].id, user.id],
        );
        return { roleId: rows[0].id, roleCode: rows[0].code };
      }
    }
    return { roleId: null, roleCode: null };
  }
}
