import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace UserApi {
  export interface User {
    id?: number;
    username: string;
    password?: string;
    email?: null | string;
    phone?: null | string;
    role: '普通员工' | '管理员';
    status: '禁用' | '启用';
    created_at?: string;
    updated_at?: string;
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
