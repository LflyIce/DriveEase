import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type PublicUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly logger: LogService,
    private readonly authService: AuthService,
  ) {}

  private toPublic(u: User): PublicUser {
    const { password: _password, ...rest } = u;
    return rest;
  }

  async findMany(
    page = 1,
    pageSize = 10,
    keyword?: string,
    role?: string,
    status?: string,
  ): Promise<PaginatedResult<PublicUser>> {
    const qb = this.repo.createQueryBuilder('u');
    const conds: string[] = [];
    const params: Record<string, any> = {};
    if (keyword) {
      conds.push('(u.username LIKE :kw OR u.email LIKE :kw OR u.phone LIKE :kw)');
      params.kw = `%${keyword}%`;
    }
    if (role) {
      conds.push('u.role = :role');
      params.role = role;
    }
    if (status) {
      conds.push('u.status = :status');
      params.status = status;
    }
    if (conds.length) qb.where(conds.join(' AND '), params);
    const [rows, total] = await qb
      .orderBy('u.id', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();
    return { data: rows.map((r) => this.toPublic(r)), total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOneOrFail(id: number): Promise<PublicUser> {
    const user = await this.repo.findOneBy({ id });
    if (!user) throw new NotFoundException('用户不存在');
    return this.toPublic(user);
  }

  async createOne(dto: CreateUserDto): Promise<PublicUser> {
    const existing = await this.repo.findOneBy({ username: dto.username });
    if (existing) throw new BadRequestException('用户名已存在');
    const existingPhone = dto.phone
      ? await this.repo.findOneBy({ phone: dto.phone })
      : null;
    if (existingPhone) throw new BadRequestException('手机号已存在');
    const saved = await this.repo.save(
      this.repo.create({
        username: dto.username,
        password: this.authService.hashPassword(dto.password || '123456'),
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        role: dto.role || '普通员工',
        status: dto.status || '启用',
      }),
    );
    this.logger.log('新增用户', dto.username);
    return this.toPublic(await this.repo.findOneByOrFail({ id: saved.id }));
  }

  async updateOne(id: number, dto: UpdateUserDto): Promise<PublicUser> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('用户不存在');
    if (dto.username && dto.username !== existing.username) {
      const dup = await this.repo.findOneBy({ username: dto.username });
      if (dup) throw new BadRequestException('用户名已存在');
    }
    await this.repo.update(id, {
      username: dto.username ?? existing.username,
      email: dto.email ?? null,
      phone: dto.phone ?? existing.phone,
      role: dto.role || existing.role,
      status: dto.status || existing.status,
      password: dto.password ? this.authService.hashPassword(dto.password) : existing.password,
    });
    this.logger.log('编辑用户', dto.username ?? existing.username);
    return this.toPublic(await this.repo.findOneByOrFail({ id }));
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('用户不存在');
    await this.repo.delete(id);
    this.logger.log('删除用户', existing.username);
    return { message: '删除成功' };
  }
}
