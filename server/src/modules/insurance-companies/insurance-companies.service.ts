import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreateInsuranceCompanyDto } from './dto/create-insurance-company.dto';
import { InsuranceCompany } from './entities/insurance-company.entity';

@Injectable()
export class InsuranceCompaniesService {
  constructor(
    @InjectRepository(InsuranceCompany) private readonly repo: Repository<InsuranceCompany>,
    private readonly logger: LogService,
  ) {}

  async findMany(
    page = 1,
    pageSize = 10,
    keyword?: string,
  ): Promise<PaginatedResult<InsuranceCompany>> {
    const qb = this.repo.createQueryBuilder('c');
    if (keyword) {
      qb.where('c.name LIKE :kw OR c.contactPerson LIKE :kw OR c.contactPhone LIKE :kw', {
        kw: `%${keyword}%`,
      });
    }
    const [data, total] = await qb
      .orderBy('c.id', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async createOne(dto: CreateInsuranceCompanyDto): Promise<InsuranceCompany> {
    const existing = await this.repo.findOneBy({ name: dto.name });
    if (existing) throw new BadRequestException('保险公司已存在');
    const saved = await this.repo.save(
      this.repo.create({
        name: dto.name,
        contactPerson: dto.contactPerson ?? null,
        contactPhone: dto.contactPhone ?? null,
      }),
    );
    this.logger.log('新增保险公司', dto.name);
    return this.repo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: CreateInsuranceCompanyDto): Promise<InsuranceCompany> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('保险公司不存在');
    await this.repo.update(id, {
      name: dto.name,
      contactPerson: dto.contactPerson ?? null,
      contactPhone: dto.contactPhone ?? null,
    });
    this.logger.log('编辑保险公司', dto.name || existing.name);
    return this.repo.findOneByOrFail({ id });
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('保险公司不存在');
    await this.repo.delete(id);
    this.logger.log('删除保险公司', existing.name);
    return { message: '删除成功' };
  }
}
