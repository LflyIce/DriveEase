import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace LogApi {
  export interface Log {
    id: number;
    operator: string;
    action: string;
    target?: string;
    detail?: string;
    result: string;
    createdAt: string;
  }
  export interface PageResult {
    data: Log[];
    total: number;
    page: number;
    pageSize: number;
  }
}

export async function getLogList(params: Recordable<any>) {
  const res = await requestClient.get<LogApi.PageResult>('/logs', { params });
  return { items: res.data, total: res.total };
}
