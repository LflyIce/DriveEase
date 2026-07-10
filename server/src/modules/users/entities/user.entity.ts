import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column() username: string;
  @Column() password: string;
  @Column({ nullable: true }) email: string | null;
  @Column({ nullable: true }) phone: string | null;
  @Column() role: string; // '管理员' | '普通员工'
  @Column() status: string; // '启用' | '禁用'

  @Column({ name: 'created_at', insert: false }) createdAt: string;
  @Column({ name: 'updated_at', insert: false }) updatedAt: string;
}
