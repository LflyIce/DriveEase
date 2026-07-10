import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('renewal_record')
export class RenewalRecord {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'old_policy_id' }) oldPolicyId: number;
  @Column({ name: 'new_policy_id', nullable: true }) newPolicyId: number | null;
  @Column({ name: 'remind_date' }) remindDate: string;
  @Column() status: string; // '待提醒' | '已提醒' | '已续保' | '已过期'
  @Column({ nullable: true }) note: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
}
