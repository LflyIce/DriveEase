import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('operation_log')
export class OperationLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() operator: string;
  @Column() action: string;
  @Column({ nullable: true }) target: string | null;
  @Column({ nullable: true }) detail: string | null;
  @Column() result: string; // '成功' | '失败'

  @Column({ name: 'created_at', insert: false }) createdAt: string;
}
