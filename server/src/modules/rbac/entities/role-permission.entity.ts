import { Column, Entity } from 'typeorm';

// 联合主键（role_id, permission_id），无自增 id。主要用原生 SQL 维护。
@Entity('role_permission')
export class RolePermission {
  @Column({ name: 'role_id', primary: true }) roleId: number;
  @Column({ name: 'permission_id', primary: true }) permissionId: number;
}
