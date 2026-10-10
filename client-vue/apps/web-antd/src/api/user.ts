import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace UserApi {
  export interface User {
    id?: number;
    username: string;
    password?: string;
    email?: null | string;
    phone?: null | string;
    /** 角色显示名（后端按 roleId 回填，两者保持同步；角色可由角色管理动态新增） */
    role: string;
    /** 关联角色 id（表单提交/编辑回显用它，role 仅作展示） */
    roleId?: null | number;
    status: '禁用' | '启用';
    createdAt?: string;
    updatedAt?: string;
  }
  export interface PageResult {
    data: User[];
    total: number;
    page: number;
    pageSize: number;
  }
}

export async function getUserList(params: Recordable<any>) {
  const res = await requestClient.get<UserApi.PageResult>('/users', { params });
  return { items: res.data, total: res.total };
}

export function createUser(data: UserApi.User) {
  return requestClient.post<UserApi.User>('/users', data);
}

export function updateUser(id: number, data: UserApi.User) {
  return requestClient.put<UserApi.User>(`/users/${id}`, data);
}

export function deleteUser(id: number) {
  return requestClient.delete(`/users/${id}`);
}
