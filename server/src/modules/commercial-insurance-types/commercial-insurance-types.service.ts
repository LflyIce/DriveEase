import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreateCommercialInsuranceTypeDto } from './dto/create-commercial-insurance-type.dto';
import { CommercialInsuranceType } from './entities/commercial-insurance-type.entity';

@Injectable()
export class CommercialInsuranceTypesService {
  constructor(
    @InjectRepository(CommercialInsuranceType) private readonly repo: Repository<CommercialInsuranceType>,
    private readonly logger: LogService,
  ) {}

  async findMany(
    page = 1,
    pageSize = 10,
    keyword?: string,
    status?: string,
  ): Promise<PaginatedResult<CommercialInsuranceType>> {
    const qb = this.repo.createQueryBuilder('c');
    const conds: string[] = [];
    const params: Record<string, any> = {};
    if (keyword) {
      conds.push('c.name LIKE :kw');
      params.kw = `%${keyword}%`;
    }
    if (status) {
      conds.push('c.status = :status');
      params.status = status;
    }
    if (conds.length) qb.where(conds.join(' AND '), params);
    const [data, total] = await qb
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createOne(dto: CreateCommercialInsuranceTypeDto): Promise<CommercialInsuranceType> {
    const existing = await this.repo.findOneBy({ name: dto.name });
    if (existing) throw new BadRequestException('商业险种已存在');
    const saved = await this.repo.save(
      this.repo.create({
        name: dto.name,
        status: dto.status || '启用',
        sortOrder: dto.sortOrder ?? 0,
        remark: dto.remark ?? null,
      }),
    );
    this.logger.log('新增商业险种', dto.name);
    return this.repo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: CreateCommercialInsuranceTypeDto): Promise<CommercialInsuranceType> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('商业险种不存在');
    await this.repo.update(id, {
      name: dto.name,
      status: dto.status || existing.status,
      sortOrder: dto.sortOrder ?? 0,
      remark: dto.remark ?? null,
    });
    this.logger.log('编辑商业险种', dto.name || existing.name);
    return this.repo.findOneByOrFail({ id });
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('商业险种不存在');
    await this.repo.delete(id);
    this.logger.log('删除商业险种', existing.name);
    return { message: '删除成功' };
  }
}
