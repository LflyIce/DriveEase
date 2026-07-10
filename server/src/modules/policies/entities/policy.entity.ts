import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('policy')
export class Policy {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'policy_number' }) policyNumber: string;
  @Column({ name: 'customer_id' }) customerId: number;
  @Column({ name: 'vehicle_id' }) vehicleId: number;
  @Column({ name: 'insurance_type' }) insuranceType: string; // '交强险' | '商业险' | '综合'
  @Column() premium: number;
  @Column({ name: 'sum_insured' }) sumInsured: number;
  @Column({ name: 'start_date' }) startDate: string | null;
  @Column({ name: 'end_date' }) endDate: string | null;
  @Column() status: string; // '生效' | '待生效' | '已过期' | '已退保'
  @Column({ nullable: true }) remark: string | null;

  @Column({ name: 'issue_time', nullable: true }) issueTime: string | null;
  @Column({ name: 'policy_date', nullable: true }) policyDate: string | null;
  @Column({ name: 'effective_date', nullable: true }) effectiveDate: string | null;
  @Column({ name: 'expiry_date', nullable: true }) expiryDate: string | null;
  @Column({ name: 'certificate_type', nullable: true }) certificateType: string | null;
  @Column({ name: 'certificate_number', nullable: true }) certificateNumber: string | null;
  @Column({ name: 'insurance_company', nullable: true }) insuranceCompany: string | null;
  @Column({ name: 'contact_person', nullable: true }) contactPerson: string | null;
  @Column({ name: 'contact_phone', nullable: true }) contactPhone: string | null;
  @Column({ name: 'sales_person', nullable: true }) salesPerson: string | null;

  // JSON-in-TEXT：服务层 JSON.stringify 入库，作为字符串返回（响应拦截器不动字符串值）
  @Column({ name: 'compulsory_detail', nullable: true }) compulsoryDetail: string | null;
  @Column({ name: 'commercial_detail', nullable: true }) commercialDetail: string | null;

  // 保费明细
  @Column({ name: 'traffic_premium', nullable: true }) trafficPremium: number | null;
  @Column({ name: 'travel_tax', nullable: true }) travelTax: number | null;
  @Column({ name: 'commercial_premium', nullable: true }) commercialPremium: number | null;
  @Column({ name: 'surcharge_premium', nullable: true }) surchargePremium: number | null;
  @Column({ name: 'surcharge_premium2', nullable: true }) surchargePremium2: number | null;

  // 手续费
  @Column({ nullable: true }) commission: number | null;
  @Column({ nullable: true }) expenses: number | null;
  @Column({ name: 'traffic_rate', nullable: true }) trafficRate: number | null;
  @Column({ name: 'traffic_charge', nullable: true }) trafficCharge: number | null;
  @Column({ name: 'commercial_rate', nullable: true }) commercialRate: number | null;
  @Column({ name: 'commercial_charge', nullable: true }) commercialCharge: number | null;
  @Column({ name: 'surcharge_rate', nullable: true }) surchargeRate: number | null;
  @Column({ name: 'surcharge_charge', nullable: true }) surchargeCharge: number | null;
  @Column({ name: 'surcharge_rate2', nullable: true }) surchargeRate2: number | null;
  @Column({ name: 'surcharge_charge2', nullable: true }) surchargeCharge2: number | null;
  @Column({ name: 'total_charge', nullable: true }) totalCharge: number | null;

  // 材料上传 URL
  @Column({ nullable: true }) quotation: string | null;
  @Column({ name: 'policy_file', nullable: true }) policyFile: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
