import { requestClient } from '#/api/request';

export namespace RbacApi {
  export interface Role {
    id: number;
    name: string;
    code: string;
    isBuiltIn: number;
    description: null | string;
    permissions: string[];
    createdAt?: string;
    updatedAt?: string;
  }

  export interface Permission {
    id: number;
    code: string;
    name: string;
    type: 'action' | 'menu';
    module: string;
    sort: number;
  }

  export interface RolePayload {
    name: string;
    code: string;
    description?: string;
  }
}

/** 角色列表（含每角色权限码集，用于回显勾选） */
export function getRoleList() {
  return requestClient.get<RbacApi.Role[]>('/roles');
}

/** 全部权限项（只读，前端按 type/module 分组渲染） */
export function getPermissionList() {
  return requestClient.get<RbacApi.Permission[]>('/permissions');
}

export function createRole(data: RbacApi.RolePayload) {
  return requestClient.post<RbacApi.Role>('/roles', data);
}

/** 编辑角色（仅 name/description，code/内置不可改） */
export function updateRole(id: number, data: Partial<RbacApi.RolePayload>) {
  return requestClient.put<RbacApi.Role>(`/roles/${id}`, data);
}

export function deleteRole(id: number) {
  return requestClient.delete(`/roles/${id}`);
}

/** 全量覆盖某角色的权限码 */
export function setRolePermissions(id: number, codes: string[]) {
  return requestClient.put(`/roles/${id}/permissions`, { codes });
}
