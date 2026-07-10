import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LogService } from '../../shared/audit/log.service';
import { PaginatedResult } from '../../shared/dto/paginated-result';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly repo: Repository<Vehicle>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logger: LogService,
  ) {}

  async findMany(
    page = 1,
    pageSize = 10,
    keyword?: string,
    customerId?: number,
  ): Promise<PaginatedResult<any>> {
    const conditions: string[] = [];
    const params: any[] = [];
    if (keyword) {
      conditions.push('(v.plate_number LIKE ? OR v.brand LIKE ? OR v.vin LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (customerId) {
      conditions.push('v.customer_id = ?');
      params.push(customerId);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const totalRows = (await this.dataSource.query(
      `SELECT COUNT(*) as count FROM vehicle v ${where}`,
      params,
    )) as any[];
    const total = totalRows[0]?.count || 0;
    const data = (await this.dataSource.query(
      `SELECT v.*, c.name as customer_name, c.phone as customer_phone
       FROM vehicle v LEFT JOIN customer c ON v.customer_id = c.id
       ${where} ORDER BY v.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), (Number(page) - 1) * Number(pageSize)],
    )) as any[];
    const formatted = data.map((row: any) => ({
      ...row,
      customer: row.customer_name
        ? { id: row.customer_id, name: row.customer_name, phone: row.customer_phone }
        : null,
    }));
    return { data: formatted, total, page: Number(page), pageSize: Number(pageSize) };
  }

  async findOneOrFail(id: number): Promise<any> {
    const rows = (await this.dataSource.query(
      `SELECT v.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
       FROM vehicle v LEFT JOIN customer c ON v.customer_id = c.id WHERE v.id = ?`,
      [id],
    )) as any[];
    const row = rows[0];
    if (!row) throw new NotFoundException('车辆不存在');
    const { customer_name, customer_phone, customer_email, ...vehicle } = row;
    return {
      ...vehicle,
      customer: customer_name
        ? { name: customer_name, phone: customer_phone, email: customer_email }
        : null,
    };
  }

  async createOne(dto: CreateVehicleDto): Promise<Vehicle> {
    const saved = await this.repo.save(
      this.repo.create({
        plateNumber: dto.plateNumber,
        brand: dto.brand,
        model: dto.model,
        year: dto.year ?? null,
        vin: dto.vin ?? null,
        engineNumber: dto.engineNumber ?? null,
        customerId: dto.customerId,
      }),
    );
    this.logger.log('新增车辆', dto.plateNumber);
    return this.repo.findOneByOrFail({ id: saved.id });
  }

  async updateOne(id: number, dto: CreateVehicleDto): Promise<Vehicle> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('车辆不存在');
    await this.repo.update(id, {
      plateNumber: dto.plateNumber,
      brand: dto.brand,
      model: dto.model,
      year: dto.year ?? null,
      vin: dto.vin ?? null,
      engineNumber: dto.engineNumber ?? null,
      customerId: dto.customerId,
    });
    this.logger.log('编辑车辆', dto.plateNumber);
    return this.repo.findOneByOrFail({ id });
  }

  async deleteOne(id: number): Promise<{ message: string }> {
    const existing = await this.repo.findOneBy({ id });
    if (!existing) throw new NotFoundException('车辆不存在');
    await this.repo.delete(id);
    this.logger.log('删除车辆', existing.plateNumber);
    return { message: '删除成功' };
  }
}
