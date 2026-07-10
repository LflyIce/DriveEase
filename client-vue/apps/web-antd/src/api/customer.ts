import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace CustomerApi {
  export interface Customer {
    id?: number;
    name: string;
    phone: string;
    email?: null | string;
    idNumber?: null | string;
    address?: null | string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface PageResult {
    data: Customer[];
    total: number;
    page: number;
    pageSize: number;
  }
}

/**
 * 客户列表
 * 后端返回统一外壳 { code, message, data:{ data, total, page, pageSize } }，响应拦截器已解包 data；
 * vxe-grid 全局 proxyConfig 期望 { items, total }，这里做一次映射。
 */
export async function getCustomerList(params: Recordable<any>) {
  const res = await requestClient.get<CustomerApi.PageResult>('/customers', {
    params,
  });
  return { items: res.data, total: res.total };
}

export function getCustomer(id: number) {
  return requestClient.get<CustomerApi.Customer>(`/customers/${id}`);
}

export function createCustomer(data: CustomerApi.Customer) {
  return requestClient.post<CustomerApi.Customer>('/customers', data);
}

export function updateCustomer(id: number, data: CustomerApi.Customer) {
  return requestClient.put<CustomerApi.Customer>(`/customers/${id}`, data);
}

export function deleteCustomer(id: number) {
  return requestClient.delete(`/customers/${id}`);
}
