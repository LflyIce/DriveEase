import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace InsuranceCompanyApi {
  export interface Company {
    id?: number;
    name: string;
    contact_person?: null | string;
    contact_phone?: null | string;
    created_at?: string;
    updated_at?: string;
  }
  export interface PageResult {
    data: Company[];
    total: number;
    page: number;
    pageSize: number;
  }
}

export async function getInsuranceCompanyList(params: Recordable<any>) {
  const res = await requestClient.get<InsuranceCompanyApi.PageResult>(
    '/insurance-companies',
    { params },
  );
  return { items: res.data, total: res.total };
}

export function createInsuranceCompany(data: InsuranceCompanyApi.Company) {
  return requestClient.post<InsuranceCompanyApi.Company>(
    '/insurance-companies',
    data,
  );
}

export function updateInsuranceCompany(
  id: number,
  data: InsuranceCompanyApi.Company,
) {
  return requestClient.put<InsuranceCompanyApi.Company>(
    `/insurance-companies/${id}`,
    data,
  );
}

export function deleteInsuranceCompany(id: number) {
  return requestClient.delete(`/insurance-companies/${id}`);
}
