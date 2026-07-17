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
    expiryWithin?: number,
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
    // 到期窗口：未来 N 天内到期且未过期（expiry_date 存 'YYYY-MM-DD'，字典序即日期序）
    if (expiryWithin && expiryWithin > 0) {
      const pad = (n: number) => String(n).padStart(2, '0');
      const now = new Date();
      const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const futureDate = new Date(now.getTime() + expiryWithin * 24 * 3600 * 1000);
      const future = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;
      conditions.push('(p.expiry_date IS NOT NULL AND p.expiry_date >= ? AND p.expiry_date <= ?)');
      params.push(today, future);
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

  // 详情：保单全字段 + 关联客户/车辆全字段（含证件照片 URL）。
  // 拆成 3 条查询，避免 customer/vehicle 的 id/created_at/customer_id 等列名与 policy 冲突。
  // 返回 snake_case 行 + 嵌套 snake_case 对象，由 TransformInterceptor 统一转 camelCase。
  async findOneOrFail(id: number): Promise<any> {
    const policyRows = (await this.dataSource.query(
      'SELECT * FROM policy WHERE id = ?',
      [id],
    )) as any[];
    const p = policyRows[0];
    if (!p) throw new NotFoundException('保单不存在');

    const customer = p.customer_id
      ? ((await this.dataSource.query('SELECT * FROM customer WHERE id = ?', [p.customer_id])) as any[])[0] ?? null
      : null;
    const vehicle = p.vehicle_id
      ? ((await this.dataSource.query('SELECT * FROM vehicle WHERE id = ?', [p.vehicle_id])) as any[])[0] ?? null
      : null;

    return { ...p, customer, vehicle };
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
    const e = existingRows[0];
    if (!e) throw new NotFoundException('保单不存在');

    // 编辑只改保单自身字段：不动 customer_id/vehicle_id（归属）；未暴露字段（开单时间/证件/明细）不在 SET，保留原值。
    // 每字段 existing 兜底（dto.x !== undefined ? dto.x : e.x），避免未传值被写成 null；不用 || 以免合法 0 被吞。
    const pick = (val: any, fallback: any) => (val !== undefined ? val : fallback);
    // 日期双写（与 createOne 对齐）：起保/生效/开始 = 投保日；到期/结束 = 到期日
    const policyDate = pick(dto.policyDate, e.policy_date) ?? null;
    const expiryDate = pick(dto.expiryDate, e.expiry_date) ?? null;

    await this.dataSource.query(
      `UPDATE policy SET
         policy_number=?, insurance_type=?, premium=?, sum_insured=?,
         policy_date=?, effective_date=?, expiry_date=?, start_date=?, end_date=?,
         insurance_company=?, contact_person=?, contact_phone=?, sales_person=?,
         status=?, remark=?,
         traffic_premium=?, travel_tax=?, commercial_premium=?, surcharge_premium=?, surcharge_premium2=?,
         commission=?, expenses=?,
         traffic_rate=?, traffic_charge=?, commercial_rate=?, commercial_charge=?,
         surcharge_rate=?, surcharge_charge=?, surcharge_rate2=?, surcharge_charge2=?,
         total_charge=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [
        pick(dto.policyNumber, e.policy_number),
        pick(dto.insuranceType, e.insurance_type),
        pick(dto.premium, e.premium),
        pick(dto.sumInsured, e.sum_insured),
        policyDate,
        policyDate,
        expiryDate,
        policyDate,
        expiryDate,
        pick(dto.insuranceCompany, e.insurance_company) ?? null,
        pick(dto.contactPerson, e.contact_person) ?? null,
        pick(dto.contactPhone, e.contact_phone) ?? null,
        pick(dto.salesPerson, e.sales_person) ?? null,
        pick(dto.status, e.status),
        pick(dto.remark, e.remark) ?? null,
        pick(dto.trafficPremium, e.traffic_premium),
        pick(dto.travelTax, e.travel_tax),
        pick(dto.commercialPremium, e.commercial_premium),
        pick(dto.surchargePremium, e.surcharge_premium),
        pick(dto.surchargePremium2, e.surcharge_premium2),
        pick(dto.commission, e.commission),
        pick(dto.expenses, e.expenses),
        pick(dto.trafficRate, e.traffic_rate),
        pick(dto.trafficCharge, e.traffic_charge),
        pick(dto.commercialRate, e.commercial_rate),
        pick(dto.commercialCharge, e.commercial_charge),
        pick(dto.surchargeRate, e.surcharge_rate),
        pick(dto.surchargeCharge, e.surcharge_charge),
        pick(dto.surchargeRate2, e.surcharge_rate2),
        pick(dto.surchargeCharge2, e.surcharge_charge2),
        pick(dto.totalCharge, e.total_charge),
        id,
      ],
    );
    this.logger.log('编辑保单', e.policy_number);
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

  // 录入页聚合接口：客户(按手机号命中则只复用 id，否则新建) + 车辆(永远新建，车牌重复则拒绝) + 新建保单。
  // 设计：录入=新车新单；同车新一期保单走续保(renewals)流程。注：sql.js 默认无事务，多步写非原子。
  async createFull(b: CreatePolicyFullDto): Promise<any> {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. 客户：按 phone 查，命中只复用 id（不改字段，老资料保持不变）
    let customerId: number | undefined;
    if (b.phone) {
      const exist = await this.customerRepo.findOneBy({ phone: b.phone });
      if (exist) customerId = exist.id;
    }

    // 2. 必填显式校验（提示准确；DB NOT NULL 兜底会按列序报错，可能错位成其他字段）
    if (!b.name) throw new BadRequestException('客户名称为必填');
    if (!b.phone) throw new BadRequestException('手机号码为必填');
    // 车辆：录入页一车一保单——车牌必须不存在。提前校验，避免插了客户又抛错留孤儿行
    if (!b.plateNumber) throw new BadRequestException('车牌号为必填');
    const vehicleExist = await this.vehicleRepo.findOneBy({ plateNumber: b.plateNumber });
    if (vehicleExist) {
      throw new BadRequestException('该车牌已录入，如需续保请使用续保流程');
    }

    // 3. 新客户才插入（复用时跳过）
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

    // 4. 插入新车辆（车牌已确认不存在；旧 brand/model 用 brandModel 兜底）
    const brandModel = b.brandModel ?? '';
    const savedVehicle = await this.vehicleRepo.save(
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
    const vehicleId = savedVehicle.id;

    // 5. 新建保单（policy_number 自动生成；推导 insurance_type；日期双写）
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
