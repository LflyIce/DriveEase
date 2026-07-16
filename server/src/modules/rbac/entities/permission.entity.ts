import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('permission')
export class Permission {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() code: string;
  @Column() name: string;
  // 'menu' | 'action'
  @Column() type: string;
  @Column({ nullable: true }) module: string | null;
  @Column({ default: 0 }) sort: number;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
}
