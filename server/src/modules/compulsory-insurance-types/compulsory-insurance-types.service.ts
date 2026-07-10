import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreateCompulsoryInsuranceTypeDto } from './dto/create-compulsory-insurance-type.dto';
import { CompulsoryInsuranceType } from './entities/compulsory-insurance-type.entity';

@Injectable()
export class CompulsoryInsuranceTypesService {
  constructor(
    @InjectRepository(CompulsoryInsuranceType) private readonly repo: Repository<CompulsoryInsuranceType>,
    private readonly logger: LogService,
  ) {}

  async findMany(
    page = 1,
    pageSize = 10,
    keyword?: string,
  ): Promise<PaginatedResult<CompulsoryInsuranceType>> {
    const qb = this.repo.createQueryBuilder('c');
    if (keyword) qb.where('c.name LIKE :kw', { kw: `%${keyword}%` });
    const [data, total] = await qb
      .orderBy('c.id', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createOne(dto: CreateCompulsoryInsuranceTypeDto): Promise<CompulsoryInsuranceType> {
    const existing = await this.repo.findOneBy({ name: dto.name });
    if (existing) throw new BadRequestException('交强险名称已存在');
    const saved = await this.repo.save(this.repo.create({ name: dto.name }));
    this.logger.log('新增交强险', dto.name);
    return this.repo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: CreateCompulsoryInsuranceTypeDto): Promise<CompulsoryInsuranceType> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('交强险名称不存在');
    await this.repo.update(id, { name: dto.name });
    this.logger.log('编辑交强险', dto.name || existing.name);
    return this.repo.findOneByOrFail({ id });
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('交强险名称不存在');
    await this.repo.delete(id);
    this.logger.log('删除交强险', existing.name);
    return { message: '删除成功' };
  }
}
