import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace CommercialInsuranceApi {
  export interface Type {
    id?: number;
    name: string;
    status?: '禁用' | '启用';
    sortOrder?: number;
    remark?: null | string;
    createdAt?: string;
    updatedAt?: string;
  }
  export interface PageResult {
    data: Type[];
    total: number;
    page: number;
    pageSize: number;
  }
}

export async function getCommercialInsuranceList(params: Recordable<any>) {
  const res = await requestClient.get<CommercialInsuranceApi.PageResult>(
    '/commercial-insurance-types',
    { params },
  );
  return { items: res.data, total: res.total };
}

export function createCommercialInsurance(data: CommercialInsuranceApi.Type) {
  return requestClient.post<CommercialInsuranceApi.Type>(
    '/commercial-insurance-types',
    data,
  );
}

export function updateCommercialInsurance(
  id: number,
  data: CommercialInsuranceApi.Type,
) {
  return requestClient.put<CommercialInsuranceApi.Type>(
    `/commercial-insurance-types/${id}`,
    data,
  );
}

export function deleteCommercialInsurance(id: number) {
  return requestClient.delete(`/commercial-insurance-types/${id}`);
}
