import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import dayjs from 'dayjs';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreateRenewalDto } from './dto/create-renewal.dto';
import { UpdateRenewalDto } from './dto/update-renewal.dto';
import { RenewDto } from './dto/renew.dto';
import { RenewalRecord } from './entities/renewal-record.entity';
import { Policy } from '../policies/entities/policy.entity';

const BASE_QUERY = `
  SELECT r.*,
    op.policy_number, op.customer_id,
    c.name as customer_name, c.phone as customer_phone,
    v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model,
    np.policy_number as new_policy_number
  FROM renewal_record r
  LEFT JOIN policy op ON r.old_policy_id = op.id
  LEFT JOIN customer c ON op.customer_id = c.id
  LEFT JOIN vehicle v ON op.vehicle_id = v.id
  LEFT JOIN policy np ON r.new_policy_id = np.id
`;

@Injectable()
export class RenewalsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(RenewalRecord) private readonly renewalRepo: Repository<RenewalRecord>,
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
  ) {}

  private formatRenewal(row: any): any {
    const {
      old_policy_id,
      policy_number,
      customer_name,
      customer_phone,
      plate_number,
      vehicle_brand,
      vehicle_model,
      new_policy_id,
      new_policy_number,
      ...renewal
    } = row;
    return {
      ...renewal,
      old_policy_id,
      oldPolicy: policy_number
        ? {
            id: old_policy_id,
            policy_number,
            customer: customer_name ? { name: customer_name, phone: customer_phone } : null,
            vehicle: plate_number ? { plate_number, brand: vehicle_brand, model: vehicle_model } : null,
          }
        : null,
      new_policy_id,
      newPolicy: new_policy_number ? { id: new_policy_id, policy_number: new_policy_number } : null,
    };
  }

  async findMany(page = 1, pageSize = 10, status?: string): Promise<PaginatedResult<any>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const totalRows = (await this.dataSource.query(
      `SELECT COUNT(*) as count FROM renewal_record r ${where}`,
      params,
    )) as any[];
    const total = totalRows[0]?.count || 0;
    const data = (await this.dataSource.query(`${BASE_QUERY} ${where} ORDER BY r.id DESC LIMIT ? OFFSET ?`, [
      ...params,
      Number(pageSize),
      (Number(page) - 1) * Number(pageSize),
    ])) as any[];
    return {
      data: data.map((row) => this.formatRenewal(row)),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  async findUpcoming(): Promise<any[]> {
    const today = dayjs().format('YYYY-MM-DD');
    const later = dayjs().add(30, 'day').format('YYYY-MM-DD');
    const data = (await this.dataSource.query(
      `${BASE_QUERY} WHERE r.status IN ('待提醒', '已提醒') AND r.remind_date BETWEEN ? AND ? ORDER BY r.remind_date ASC`,
      [today, later],
    )) as any[];
    return data.map((row) => this.formatRenewal(row));
  }

  async createOne(dto: CreateRenewalDto): Promise<RenewalRecord> {
    const saved = await this.renewalRepo.save(
      this.renewalRepo.create({
        oldPolicyId: dto.oldPolicyId,
        remindDate: dto.remindDate,
        // 显式设默认 status：@Column 字段 TypeORM 会显式插 NULL，覆盖 schema 的 DEFAULT '待提醒'
        status: '待提醒',
        note: dto.note || null,
      }),
    );
    return this.renewalRepo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: UpdateRenewalDto): Promise<any> {
    const existingRows = (await this.dataSource.query(
      'SELECT * FROM renewal_record WHERE id = ?',
      [id],
    )) as any[];
    if (!existingRows[0]) throw new NotFoundException('续保记录不存在');
    await this.dataSource.query(
      'UPDATE renewal_record SET status = COALESCE(?, status), note = COALESCE(?, note) WHERE id = ?',
      [dto.status || null, dto.note || null, id],
    );
    const rows = (await this.dataSource.query('SELECT * FROM renewal_record WHERE id = ?', [id])) as any[];
    return rows[0];
  }

  // 续保：克隆旧保单 → 新保单，回填 new_policy_id，状态置 已续保
  async renew(id: number, body: RenewDto): Promise<any> {
    const recordRows = (await this.dataSource.query('SELECT * FROM renewal_record WHERE id = ?', [
      id,
    ])) as any[];
    const record = recordRows[0];
    if (!record) throw new NotFoundException('续保记录不存在');
    const oldRows = (await this.dataSource.query(
      `SELECT p.*, c.name as customer_name, v.plate_number
       FROM policy p LEFT JOIN customer c ON p.customer_id = c.id
       LEFT JOIN vehicle v ON p.vehicle_id = v.id WHERE p.id = ?`,
      [record.old_policy_id],
    )) as any[];
    const oldPolicy = oldRows[0];
    if (!oldPolicy) throw new NotFoundException('原保单不存在');

    const newPolicyNumber = body.policyNumber || `RNW-${Date.now()}`;
    const startDate = body.startDate || dayjs(oldPolicy.end_date).add(1, 'day').format('YYYY-MM-DD');
    const endDate = body.endDate || dayjs(oldPolicy.end_date).add(1, 'year').format('YYYY-MM-DD');

    // Repository 写入：driver 在 autoSave 前捕获 lastInsertRowid（原生 query 的 last_insert_rowid() 会被重置）
    const savedPolicy = await this.policyRepo.save(
      this.policyRepo.create({
        policyNumber: newPolicyNumber,
        customerId: oldPolicy.customer_id,
        vehicleId: oldPolicy.vehicle_id,
        insuranceType: body.insuranceType || oldPolicy.insurance_type,
        premium: body.premium || oldPolicy.premium,
        sumInsured: body.sumInsured || oldPolicy.sum_insured,
        startDate,
        endDate,
        status: '待生效',
        remark: body.remark || `续保自保单 ${oldPolicy.policy_number}`,
      }),
    );

    await this.dataSource.query(
      'UPDATE renewal_record SET new_policy_id = ?, status = ? WHERE id = ?',
      [savedPolicy.id, '已续保', id],
    );

    const renewalRecordRows = (await this.dataSource.query(
      'SELECT * FROM renewal_record WHERE id = ?',
      [id],
    )) as any[];
    const newPolicyRows = (await this.dataSource.query('SELECT * FROM policy WHERE id = ?', [
      savedPolicy.id,
    ])) as any[];
    return { renewalRecord: renewalRecordRows[0], newPolicy: newPolicyRows[0] };
  }
}
