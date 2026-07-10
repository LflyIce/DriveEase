import crypto from 'crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';

/**
 * 认证服务。保留原有行为：SHA-256（无盐）比对、登录成功返回 user 对象、**不发 token**。
 * 路由仍保持开放（不强制 JwtAuthGuard）—— 与前端 localStorage 存 user、无真 token 的现状一致。
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly logger: LogService,
  ) {}

  hashPassword(pwd: string): string {
    return crypto.createHash('sha256').update(pwd).digest('hex');
  }

  async login(dto: LoginDto) {
    const user = await this.repo.findOne({
      where: { username: dto.username, password: this.hashPassword(dto.password) },
    });
    if (!user) throw new UnauthorizedException('用户名或密码错误');
    if (user.status === '禁用') throw new ForbiddenException('账户已禁用');
    this.logger.log('用户登录', dto.username, undefined, dto.username);
    const { password: _password, ...safe } = user;
    return safe;
  }
}
