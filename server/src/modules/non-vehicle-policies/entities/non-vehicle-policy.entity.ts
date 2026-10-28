import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 非车保单：与 policy 平行的独立资源（无客户/车辆关联）。
 * balance 结余 = premium - expenses，服务层写入前计算。
 * attachment 附件：多文件 URL 逗号拼接（与 policy.quotation 同方案）。
 */
@Entity('non_vehicle_policy')
export class NonVehiclePolicy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'enterprise_name' }) enterpriseName: string;
  @Column({ name: 'insurance_type' }) insuranceType: string;
  @Column({ name: 'project_name', nullable: true }) projectName: string | null;
  @Column({ name: 'person_in_charge', nullable: true }) personInCharge: string | null;
  @Column({ name: 'contact_phone', nullable: true }) contactPhone: string | null;
  @Column({ name: 'sum_insured', nullable: true }) sumInsured: number | null;
  @Column({ nullable: true }) premium: number | null;
  @Column({ nullable: true }) expenses: number | null;
  @Column({ nullable: true }) balance: number | null;
  @Column({ name: 'insurance_company', nullable: true }) insuranceCompany: string | null;
  @Column({ name: 'sales_person', nullable: true }) salesPerson: string | null;
  @Column({ name: 'start_date', nullable: true }) startDate: string | null;
  @Column({ name: 'end_date', nullable: true }) endDate: string | null;
  @Column({ nullable: true }) attachment: string | null;
  @Column({ nullable: true }) remark: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
