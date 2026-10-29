import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace NonVehiclePolicyApi {
  export interface NonVehiclePolicy {
    id?: number;
    enterpriseName: string;
    insuranceType: string;
    projectName?: null | string;
    personInCharge?: null | string;
    contactPhone?: null | string;
    sumInsured?: null | number;
    premium?: null | number;
    fee?: null | number; // 费用（金额，与保费同类型）
    expenses?: null | number;
    balance?: null | number; // 结余 = 费用 - 支出（后端计算，保费不参与）
    insuranceCompany?: null | string;
    salesPerson?: null | string;
    startDate?: null | string; // 起保时间
    endDate?: null | string; // 截止日期
    attachment?: null | string; // 附件 URL（多文件逗号拼接，与车保 quotation 同方案）
    remark?: null | string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface PageResult {
    data: NonVehiclePolicy[];
    total: number;
    page: number;
    pageSize: number;
    // 合计（后端按当前筛选条件全量聚合，footer 用）
    premiumSum?: number;
    feeSum?: number;
    expensesSum?: number;
    balanceSum?: number;
  }
}

/**
 * 非车保单列表。响应拦截器已解包；这里直接透传（行本就是扁平结构，无嵌套拍平需求）。
 */
export async function getNonVehiclePolicyList(params: Recordable<any>) {
  const res = await requestClient.get<NonVehiclePolicyApi.PageResult>(
    '/non-vehicle-policies',
    { params },
  );
  return {
    items: res.data,
    total: res.total,
    premiumSum: res.premiumSum,
    feeSum: res.feeSum,
    expensesSum: res.expensesSum,
    balanceSum: res.balanceSum,
  };
}

export function getNonVehiclePolicy(id: number) {
  return requestClient.get<NonVehiclePolicyApi.NonVehiclePolicy>(
    `/non-vehicle-policies/${id}`,
  );
}

export function createNonVehiclePolicy(data: Recordable<any>) {
  return requestClient.post('/non-vehicle-policies', data);
}

export function deleteNonVehiclePolicy(id: number) {
  return requestClient.delete(`/non-vehicle-policies/${id}`);
}
