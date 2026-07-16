import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() name: string;
  @Column() code: string;
  // 内置角色不可删（管理员=1）
  @Column({ name: 'is_built_in', default: 0 }) isBuiltIn: number;
  @Column({ nullable: true }) description: string | null;

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
