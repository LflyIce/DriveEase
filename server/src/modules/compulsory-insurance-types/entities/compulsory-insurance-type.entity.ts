import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('compulsory_insurance_type')
export class CompulsoryInsuranceType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() name: string;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
