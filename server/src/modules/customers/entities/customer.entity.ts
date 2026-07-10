import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('customer')
export class Customer {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() name: string;
  @Column() phone: string;
  @Column({ nullable: true }) email: string | null;
  @Column({ name: 'id_number', nullable: true }) idNumber: string | null;
  @Column({ nullable: true }) address: string | null;

  @Column({ name: 'birthday', nullable: true }) birthday: string | null;
  @Column({ name: 'customer_type', nullable: true }) customerType: string | null;
  @Column({ name: 'business_attribution', nullable: true }) businessAttribution: string | null;
  @Column({ name: 'business_area', nullable: true }) businessArea: string | null;
  @Column({ name: 'follow_status', nullable: true }) followStatus: string | null;

  @Column({ name: 'ssn_front', nullable: true }) ssnFront: string | null;
  @Column({ name: 'ssn_back', nullable: true }) ssnBack: string | null;
  @Column({ name: 'business_license', nullable: true }) businessLicense: string | null;
  @Column({ name: 'id_authority', nullable: true }) idAuthority: string | null;
  @Column({ name: 'id_valid_date', nullable: true }) idValidDate: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
