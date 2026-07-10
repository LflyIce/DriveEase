import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace CompulsoryInsuranceApi {
  export interface Type {
    id?: number;
    name: string;
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

export async function getCompulsoryInsuranceList(params: Recordable<any>) {
  const res = await requestClient.get<CompulsoryInsuranceApi.PageResult>(
    '/compulsory-insurance-types',
    { params },
  );
  return { items: res.data, total: res.total };
}

export function createCompulsoryInsurance(data: CompulsoryInsuranceApi.Type) {
  return requestClient.post<CompulsoryInsuranceApi.Type>(
    '/compulsory-insurance-types',
    data,
  );
}

export function updateCompulsoryInsurance(
  id: number,
  data: CompulsoryInsuranceApi.Type,
) {
  return requestClient.put<CompulsoryInsuranceApi.Type>(
    `/compulsory-insurance-types/${id}`,
    data,
  );
}

export function deleteCompulsoryInsurance(id: number) {
  return requestClient.delete(`/compulsory-insurance-types/${id}`);
}
