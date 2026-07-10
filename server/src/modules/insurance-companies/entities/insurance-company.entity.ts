import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('insurance_company')
export class InsuranceCompany {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() name: string;
  @Column({ name: 'contact_person', nullable: true }) contactPerson: string | null;
  @Column({ name: 'contact_phone', nullable: true }) contactPhone: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
