import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { CreateNonVehiclePolicyDto } from './dto/create-non-vehicle-policy.dto';
import { QueryNonVehiclePolicyDto } from './dto/query-non-vehicle-policy.dto';
import { NonVehiclePolicy } from './entities/non-vehicle-policy.entity';

@Injectable()
export class NonVehiclePoliciesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(NonVehiclePolicy) private readonly repo: Repository<NonVehiclePolicy>,
    private readonly logger: LogService,
  ) {}

  /** 列表：关键字（企业/项目/负责人/电话）+ 业务员 + 创建时间范围；合计为筛选条件下的全量聚合 */
  async findMany(
    query: QueryNonVehiclePolicyDto,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    premiumSum: number;
    feeSum: number;
    expensesSum: number;
    balanceSum: number;
  }> {
    const { page = 1, pageSize = 10 } = query;
    const conditions: string[] = [];
    const params: any[] = [];
    if (query.keyword) {
      conditions.push(
        '(enterprise_name LIKE ? OR project_name LIKE ? OR person_in_charge LIKE ? OR contact_phone LIKE ?)',
      );
      const kw = `%${query.keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    // 到期窗口：未来 N 天内到期且未过期（end_date 存 'YYYY-MM-DD'，字典序即日期序；同车保口径）
    if (query.expiryWithin && query.expiryWithin > 0) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const futureDate = new Date(now.getTime() + query.expiryWithin * 24 * 3600 * 1000);
      const future = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;
      conditions.push('(end_date IS NOT NULL AND end_date >= ? AND end_date <= ?)');
      params.push(today, future);
    }
    if (query.salesPerson) {
      conditions.push('sales_person = ?');
      params.push(query.salesPerson);
    }
    // created_at 'YYYY-MM-DD HH:MM:SS' 字典序即时间序；止点无时间部分补 23:59:59 含当日
    if (query.createdStart) {
      conditions.push('created_at >= ?');
      params.push(query.createdStart.includes(':') ? query.createdStart : `${query.createdStart} 00:00:00`);
    }
    if (query.createdEnd) {
      conditions.push('created_at <= ?');
      params.push(query.createdEnd.includes(':') ? query.createdEnd : `${query.createdEnd} 23:59:59`);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const statRows = (await this.dataSource.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(premium), 0) as premium_sum,
              COALESCE(SUM(fee), 0) as fee_sum, COALESCE(SUM(expenses), 0) as expenses_sum,
              COALESCE(SUM(balance), 0) as balance_sum
       FROM non_vehicle_policy ${where}`,
      params,
    )) as any[];
    const data = (await this.dataSource.query(
      `SELECT * FROM non_vehicle_policy ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)],
    )) as any[];
    return {
      data,
      total: statRows[0]?.count || 0,
      page: Number(page),
      pageSize: Number(pageSize),
      premiumSum: Number(statRows[0]?.premium_sum) || 0,
      feeSum: Number(statRows[0]?.fee_sum) || 0,
      expensesSum: Number(statRows[0]?.expenses_sum) || 0,
      balanceSum: Number(statRows[0]?.balance_sum) || 0,
    };
  }

  async findOneOrFail(id: number): Promise<any> {
    const rows = (await this.dataSource.query('SELECT * FROM non_vehicle_policy WHERE id = ?', [
      id,
    ])) as any[];
    if (!rows[0]) throw new NotFoundException('非车保单不存在');
    return rows[0];
  }

  // Repository.save 落库（原生 query 的 last_insert_rowid() 会被 autoSave 重置为 0，拿不到新 id）
  async createOne(dto: CreateNonVehiclePolicyDto): Promise<any> {
    if (!dto.enterpriseName) throw new BadRequestException('企业名称为必填');
    if (!dto.insuranceType) throw new BadRequestException('险种为必填');
    if (!dto.projectName) throw new BadRequestException('项目名称为必填');
    if (!dto.personInCharge) throw new BadRequestException('负责人为必填');
    if (!dto.contactPhone) throw new BadRequestException('联系电话为必填');
    if (!dto.insuranceCompany) throw new BadRequestException('保险公司为必填');
    if (!dto.salesPerson) throw new BadRequestException('业务员为必填');
    if (!dto.startDate) throw new BadRequestException('起保时间为必填');
    if (!dto.endDate) throw new BadRequestException('截止日期为必填');
    // 金额必填：判空串/null/undefined（0 是合法金额）
    const requireAmount = (v: any, label: string) => {
      if (v === undefined || v === null || v === '') throw new BadRequestException(`${label}为必填`);
      return Number(v);
    };
    const sumInsured = requireAmount(dto.sumInsured, '保额');
    const premium = requireAmount(dto.premium, '保费');
    const fee = requireAmount(dto.fee, '费用');
    const expenses = requireAmount(dto.expenses, '支出');
    // 结余 = 费用 - 支出（服务端为准；保费仅记录，不参与结余）
    const balance = fee - expenses;

    const saved = await this.repo.save(
      this.repo.create({
        enterpriseName: dto.enterpriseName,
        insuranceType: dto.insuranceType,
        projectName: dto.projectName,
        personInCharge: dto.personInCharge,
        contactPhone: dto.contactPhone,
        sumInsured,
        premium,
        fee,
        expenses,
        balance,
        insuranceCompany: dto.insuranceCompany,
        salesPerson: dto.salesPerson,
        startDate: dto.startDate,
        endDate: dto.endDate,
        attachment: dto.attachment ?? null,
        remark: dto.remark ?? null,
      }),
    );
    this.logger.log(
      '非车开单',
      dto.enterpriseName,
      `保费 ${premium} / 费用 ${fee} / 结余 ${balance}`,
    );
    return this.findOneOrFail(saved.id);
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const rows = (await this.dataSource.query('SELECT * FROM non_vehicle_policy WHERE id = ?', [
      id,
    ])) as any[];
    if (!rows[0]) throw new NotFoundException('非车保单不存在');
    await this.dataSource.query('DELETE FROM non_vehicle_policy WHERE id = ?', [id]);
    this.logger.log('删除非车保单', rows[0].enterprise_name);
    return { message: '删除成功' };
  }
}
