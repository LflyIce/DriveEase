import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
    private readonly logger: LogService,
  ) {}

  async findMany(page = 1, pageSize = 10, keyword?: string): Promise<PaginatedResult<Customer>> {
    const qb = this.repo.createQueryBuilder('c');
    if (keyword) {
      qb.where('c.name LIKE :kw OR c.phone LIKE :kw OR c.idNumber LIKE :kw', { kw: `%${keyword}%` });
    }
    const [data, total] = await qb
      .orderBy('c.id', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOneOrFail(id: number): Promise<Customer> {
    const customer = await this.repo.findOneBy({ id });
    if (!customer) throw new NotFoundException('客户不存在');
    return customer;
  }

  async createOne(dto: CreateCustomerDto): Promise<Customer> {
    const saved = await this.repo.save(
      this.repo.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        idNumber: dto.idNumber ?? null,
        address: dto.address ?? null,
      }),
    );
    this.logger.log('新增客户', dto.name);
    return this.repo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: CreateCustomerDto): Promise<Customer> {
    await this.findOneOrFail(id);
    await this.repo.update(id, {
      name: dto.name,
      phone: dto.phone,
      email: dto.email ?? null,
      idNumber: dto.idNumber ?? null,
      address: dto.address ?? null,
    });
    this.logger.log('编辑客户', dto.name);
    return this.repo.findOneByOrFail({ id });
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existing = await this.findOneOrFail(id);
    await this.repo.delete(id);
    this.logger.log('删除客户', existing.name);
    return { message: '删除成功' };
  }
}
