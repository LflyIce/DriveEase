import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace RenewalApi {
  export interface Renewal {
    id: number;
    oldPolicyId: number;
    newPolicyId?: null | number;
    remindDate: string;
    status: '已提醒' | '已过期' | '已续保' | '待提醒';
    note?: null | string;
    createdAt?: string;
    oldPolicy?: {
      id: number;
      policyNumber: string;
      customer?: { name?: string; phone?: string } | null;
      vehicle?: { plateNumber?: string; brand?: string; model?: string } | null;
    } | null;
    newPolicy?: { id: number; policyNumber: string } | null;
  }
  export interface PageResult {
    data: Renewal[];
    total: number;
    page: number;
    pageSize: number;
  }
  export interface RenewResult {
    renewalRecord: Renewal;
    newPolicy: { id: number; policyNumber: string };
  }
}

export async function getRenewalList(params: Recordable<any>) {
  const res = await requestClient.get<RenewalApi.PageResult>('/renewals', {
    params,
  });
  // 拍平嵌套的 oldPolicy/newPolicy 方便表格展示
  return {
    items: res.data.map((r) => ({
      ...r,
      customerName: r.oldPolicy?.customer?.name,
      newPolicyNumber: r.newPolicy?.policyNumber,
      oldPolicyNumber: r.oldPolicy?.policyNumber,
      plateNumber: r.oldPolicy?.vehicle?.plateNumber,
    })),
    total: res.total,
  };
}

/** 未来 30 天到期提醒（仪表盘用）*/
export function getUpcomingRenewals() {
  return requestClient.get<RenewalApi.Renewal[]>('/renewals/upcoming');
}

/** 执行续保：后端自动生成新保单并把状态置为 已续保 */
export function renewRenewal(id: number, data?: Recordable<any>) {
  return requestClient.post<RenewalApi.RenewResult>(
    `/renewals/${id}/renew`,
    data ?? {},
  );
}

export function updateRenewal(id: number, data: Recordable<any>) {
  return requestClient.patch(`/renewals/${id}`, data);
}
