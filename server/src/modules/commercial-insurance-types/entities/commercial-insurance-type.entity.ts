import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('commercial_insurance_type')
export class CommercialInsuranceType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() name: string;
  @Column() status: string; // '启用' | '禁用'
  @Column({ name: 'sort_order' }) sortOrder: number;
  @Column({ nullable: true }) remark: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
