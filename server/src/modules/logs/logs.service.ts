import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { OperationLog } from './entities/operation-log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(OperationLog) private readonly repo: Repository<OperationLog>,
  ) {}

  async findMany(
    page = 1,
    pageSize = 10,
    operator?: string,
    action?: string,
  ): Promise<PaginatedResult<OperationLog>> {
    const qb = this.repo.createQueryBuilder('l');
    const conds: string[] = [];
    const params: Record<string, any> = {};
    if (operator) {
      conds.push('l.operator LIKE :op');
      params.op = `%${operator}%`;
    }
    if (action) {
      conds.push('l.action LIKE :ac');
      params.ac = `%${action}%`;
    }
    if (conds.length) qb.where(conds.join(' AND '), params);
    const [data, total] = await qb
      .orderBy('l.id', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  }
}
