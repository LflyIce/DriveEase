import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { CreatePolicyFullDto } from './dto/create-policy-full.dto';
import { Policy } from './entities/policy.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';

const POLICY_LIST_FROM =
  'FROM policy p LEFT JOIN customer c ON p.customer_id = c.id LEFT JOIN vehicle v ON p.vehicle_id = v.id';

@Injectable()
export class PoliciesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
    private readonly logger: LogService,
  ) {}

  async findMany(
    page = 1,
    pageSize = 10,
    keyword?: string,
    status?: string,
  ): Promise<PaginatedResult<any>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (keyword) {
      conditions.push('(p.policy_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR v.plate_number LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalRows = (await this.dataSource.query(
      `SELECT COUNT(*) as count ${POLICY_LIST_FROM} ${where}`,
      params,
    )) as any[];
    const total = totalRows[0]?.count || 0;
    const data = (await this.dataSource.query(
      `SELECT p.*, c.name as customer_name, c.phone as customer_phone,
              v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model
       ${POLICY_LIST_FROM} ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)],
    )) as any[];
    const formatted = data.map((row: any) => ({
      ...row,
      customer: row.customer_name
        ? { id: row.customer_id, name: row.customer_name, phone: row.customer_phone }
        : null,
      vehicle: row.plate_number
        ? { id: row.vehicle_id, plate_number: row.plate_number, brand: row.vehicle_brand, model: row.vehicle_model }
        : null,
    }));
    return { data: formatted, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOneOrFail(id: number): Promise<any> {
    const rows = (await this.dataSource.query(
      `SELECT p.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.id_number,
              v.plate_number, v.brand as vehicle_brand, v.model as vehicle_model, v.year as vehicle_year, v.vin
       ${POLICY_LIST_FROM} WHERE p.id = ?`,
      [id],
    )) as any[];
    const row = rows[0];
    if (!row) throw new NotFoundException('保单不存在');
    const {
      customer_name,
      customer_phone,
      customer_email,
      id_number,
      plate_number,
      vehicle_brand,
      vehicle_model,
      vehicle_year,
      vin,
      ...policy
    } = row;
    return {
      ...policy,
      customer: customer_name
        ? { name: customer_name, phone: customer_phone, email: customer_email, id_number }
        : null,
      vehicle: plate_number
        ? { plate_number, brand: vehicle_brand, model: vehicle_model, year: vehicle_year, vin }
        : null,
    };
  }

  // Repository 写入（driver 在 autoSave 前捕获 lastInsertRowid；原生 query 的 last_insert_rowid() 会被 autoSave 重置为 0）
  async createOne(dto: CreatePolicyDto): Promise<any> {
    const resolvedStartDate = dto.effectiveDate || dto.startDate || null;
    const resolvedEndDate = dto.expiryDate || dto.endDate || null;
    const saved = await this.policyRepo.save(
      this.policyRepo.create({
        policyNumber: dto.policyNumber,
        customerId: dto.customerId,
        vehicleId: dto.vehicleId,
        insuranceType: dto.insuranceType,
        premium: dto.premium,
        sumInsured: dto.sumInsured,
        issueTime: dto.issueTime || null,
        policyDate: dto.policyDate || null,
        effectiveDate: resolvedStartDate,
        expiryDate: resolvedEndDate,
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        certificateType: dto.certificateType || null,
        certificateNumber: dto.certificateNumber || null,
        insuranceCompany: dto.insuranceCompany || null,
        contactPerson: dto.contactPerson || null,
        contactPhone: dto.contactPhone || null,
        salesPerson: dto.salesPerson || null,
        compulsoryDetail: dto.compulsoryDetail ? JSON.stringify(dto.compulsoryDetail) : null,
        commercialDetail: dto.commercialDetail ? JSON.stringify(dto.commercialDetail) : null,
        remark: dto.remark || null,
      }),
    );
    this.logger.log('新增保单', dto.policyNumber);
    return this.policyRepo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: UpdatePolicyDto): Promise<any> {
    const existingRows = (await this.dataSource.query('SELECT * FROM policy WHERE id = ?', [id])) as any[];
    const existing = existingRows[0];
    if (!existing) throw new NotFoundException('保单不存在');
    const resolvedStartDate = dto.effectiveDate || dto.startDate || null;
    const resolvedEndDate = dto.expiryDate || dto.endDate || null;
    await this.dataSource.query(
      `UPDATE policy SET policy_number=?, customer_id=?, vehicle_id=?, insurance_type=?, premium=?, sum_insured=?,
       issue_time=?, policy_date=?, effective_date=?, expiry_date=?, start_date=?, end_date=?,
       certificate_type=?, certificate_number=?, insurance_company=?, contact_person=?, contact_phone=?, sales_person=?,
       compulsory_detail=?, commercial_detail=?, status=?, remark=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [
        dto.policyNumber || existing.policy_number,
        dto.customerId,
        dto.vehicleId,
        dto.insuranceType,
        dto.premium,
        dto.sumInsured,
        dto.issueTime || existing.issue_time || null,
        dto.policyDate || existing.policy_date || null,
        resolvedStartDate,
        resolvedEndDate,
        resolvedStartDate,
        resolvedEndDate,
        dto.certificateType || null,
        dto.certificateNumber || null,
        dto.insuranceCompany || null,
        dto.contactPerson || null,
        dto.contactPhone || null,
        dto.salesPerson || null,
        dto.compulsoryDetail ? JSON.stringify(dto.compulsoryDetail) : null,
        dto.commercialDetail ? JSON.stringify(dto.commercialDetail) : null,
        dto.status || existing.status,
        dto.remark || null,
        id,
      ],
    );
    const rows = (await this.dataSource.query('SELECT * FROM policy WHERE id = ?', [id])) as any[];
    return rows[0];
  }

  async updateStatus(id: number, status: string): Promise<any> {
    const existingRows = (await this.dataSource.query('SELECT * FROM policy WHERE id = ?', [id])) as any[];
    const existing = existingRows[0];
    if (!existing) throw new NotFoundException('保单不存在');
    await this.dataSource.query('UPDATE policy SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [
      status,
      id,
    ]);
    this.logger.log('变更保单状态', existing.policy_number, `${existing.status} → ${status}`);
    const rows = (await this.dataSource.query('SELECT * FROM policy WHERE id = ?', [id])) as any[];
    return rows[0];
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existingRows = (await this.dataSource.query('SELECT * FROM policy WHERE id = ?', [id])) as any[];
    const existing = existingRows[0];
    if (!existing) throw new NotFoundException('保单不存在');
    await this.dataSource.query('DELETE FROM policy WHERE id = ?', [id]);
    this.logger.log('删除保单', existing.policy_number);
    return { message: '删除成功' };
  }

  // 录入页聚合接口：upsert 客户(按手机号) + 车辆(按车牌) + 新建保单
  // 注：sql.js 默认无事务，多步写非原子（与原 Express 版一致）
  async createFull(b: CreatePolicyFullDto): Promise<any> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. upsert customer（按 phone 复用）
    let customerId: number | undefined;
    if (b.phone) {
      const exist = await this.customerRepo.findOneBy({ phone: b.phone });
      if (exist) {
        await this.customerRepo.update(exist.id, {
          name: b.name,
          idNumber: b.idNumber ?? null,
          birthday: b.birthday ?? null,
          customerType: b.customerType ?? null,
          businessAttribution: b.businessAttribution ?? null,
          businessArea: b.businessArea ?? null,
          address: b.address ?? null,
          followStatus: b.followStatus ? JSON.stringify(b.followStatus) : null,
          ssnFront: b.ssnFront ?? null,
          businessLicense: b.businessLicense ?? null,
          ssnBack: b.ssnBack ?? null,
          idAuthority: b.idAuthority ?? null,
          idValidDate: b.idValidDate ?? null,
        });
        customerId = exist.id;
      }
    }
    if (customerId === undefined) {
      const saved = await this.customerRepo.save(
        this.customerRepo.create({
          name: b.name,
          phone: b.phone,
          idNumber: b.idNumber ?? null,
          birthday: b.birthday ?? null,
          customerType: b.customerType ?? null,
          businessAttribution: b.businessAttribution ?? null,
          businessArea: b.businessArea ?? null,
          address: b.address ?? null,
          followStatus: b.followStatus ? JSON.stringify(b.followStatus) : null,
          ssnFront: b.ssnFront ?? null,
          businessLicense: b.businessLicense ?? null,
          ssnBack: b.ssnBack ?? null,
          idAuthority: b.idAuthority ?? null,
          idValidDate: b.idValidDate ?? null,
        }),
      );
      customerId = saved.id;
    }

    // 2. upsert vehicle（按 plateNumber 复用；旧 brand/model 用 brandModel 兜底）
    let vehicleId: number | undefined;
    const brandModel = b.brandModel ?? '';
    if (b.plateNumber) {
      const exist = await this.vehicleRepo.findOneBy({ plateNumber: b.plateNumber });
      if (exist) {
        await this.vehicleRepo.update(exist.id, {
          brand: brandModel,
          model: brandModel,
          vin: b.vin ?? null,
          engineNumber: b.engineNumber ?? null,
          brandModel,
          energyType: b.energyType ?? null,
          vehicleType: b.vehicleType ?? null,
          registerDate: b.registerDate ?? null,
          certificateDate: b.certificateDate ?? null,
          nextInspectionDate: b.nextInspectionDate ?? null,
          transferFlag: b.transferFlag ?? null,
          seats: b.seats ?? null,
          loadCapacity: b.loadCapacity ?? null,
          drivingFront: b.drivingFront ?? null,
          drivingBack: b.drivingBack ?? null,
          customerId,
        });
        vehicleId = exist.id;
      }
    }
    if (vehicleId === undefined) {
      if (!b.plateNumber) throw new BadRequestException('车牌号为必填');
      const saved = await this.vehicleRepo.save(
        this.vehicleRepo.create({
          plateNumber: b.plateNumber,
          brand: brandModel,
          model: brandModel,
          vin: b.vin ?? null,
          engineNumber: b.engineNumber ?? null,
          customerId,
          brandModel,
          energyType: b.energyType ?? null,
          vehicleType: b.vehicleType ?? null,
          registerDate: b.registerDate ?? null,
          certificateDate: b.certificateDate ?? null,
          nextInspectionDate: b.nextInspectionDate ?? null,
          transferFlag: b.transferFlag ?? null,
          seats: b.seats ?? null,
          loadCapacity: b.loadCapacity ?? null,
          drivingFront: b.drivingFront ?? null,
          drivingBack: b.drivingBack ?? null,
        }),
      );
      vehicleId = saved.id;
    }

    // 3. 新建保单（policy_number 自动生成；推导 insurance_type；日期双写）
    const policyNumber = `POL-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const hasTraffic = Number(b.trafficPremium) > 0;
    const hasCommercial = Number(b.commercialPremium) > 0;
    const insuranceType =
      hasTraffic && hasCommercial ? '综合' : hasTraffic ? '交强险' : hasCommercial ? '商业险' : '综合';
    const premium = Number(b.premium) || 0;
    const sumInsured = Number(b.sumInsured) || premium;
    const policyDate = b.policyDate || today;
    const expiryDate =
      b.expiryDate || `${now.getFullYear() + 1}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const savedPolicy = await this.policyRepo.save(
      this.policyRepo.create({
        policyNumber,
        customerId,
        vehicleId,
        insuranceType,
        premium,
        sumInsured,
        startDate: policyDate,
        endDate: expiryDate,
        status: '待生效',
        policyDate,
        effectiveDate: policyDate,
        expiryDate: expiryDate,
        insuranceCompany: b.insuranceCompany ?? null,
        salesPerson: b.salesPerson ?? null,
        remark: b.remark ?? null,
        trafficPremium: b.trafficPremium ?? null,
        travelTax: b.travelTax ?? null,
        commercialPremium: b.commercialPremium ?? null,
        surchargePremium: b.surchargePremium ?? null,
        surchargePremium2: b.surchargePremium2 ?? null,
        commission: b.commission ?? null,
        expenses: b.expenses ?? null,
        trafficRate: b.trafficRate ?? null,
        trafficCharge: b.trafficCharge ?? null,
        commercialRate: b.commercialRate ?? null,
        commercialCharge: b.commercialCharge ?? null,
        surchargeRate: b.surchargeRate ?? null,
        surchargeCharge: b.surchargeCharge ?? null,
        surchargeRate2: b.surchargeRate2 ?? null,
        surchargeCharge2: b.surchargeCharge2 ?? null,
        totalCharge: b.totalCharge ?? null,
        quotation: b.quotation ?? null,
        policyFile: b.policyFile ?? null,
      }),
    );

    this.logger.log('新增保单', policyNumber);
    return { customerId, vehicleId, policyId: savedPolicy.id, policyNumber };
  }
}
