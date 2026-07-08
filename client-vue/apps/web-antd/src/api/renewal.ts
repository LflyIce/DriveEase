import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace RenewalApi {
  export interface Renewal {
    id: number;
    old_policy_id: number;
    new_policy_id?: null | number;
    remind_date: string;
    status: '已提醒' | '已过期' | '已续保' | '待提醒';
    note?: null | string;
    created_at?: string;
    oldPolicy?: {
      id: number;
      policy_number: string;
      customer?: { name?: string; phone?: string } | null;
      vehicle?: { plate_number?: string; brand?: string; model?: string } | null;
    } | null;
    newPolicy?: { id: number; policy_number: string } | null;
  }
  export interface PageResult {
    data: Renewal[];
    total: number;
    page: number;
    pageSize: number;
  }
  export interface RenewResult {
    renewalRecord: Renewal;
    newPolicy: { id: number; policy_number: string };
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
      customer_name: r.oldPolicy?.customer?.name,
      new_policy_number: r.newPolicy?.policy_number,
      old_policy_number: r.oldPolicy?.policy_number,
      plate_number: r.oldPolicy?.vehicle?.plate_number,
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
