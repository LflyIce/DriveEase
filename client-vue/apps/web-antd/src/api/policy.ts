import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace PolicyApi {
  /** 保单状态（与后端 policy.status CHECK 约束一致） */
  export type PolicyStatus = '生效' | '待生效' | '已过期' | '已退保';
  /** 险种（与后端 policy.insurance_type CHECK 约束一致） */
  export type InsuranceType = '交强险' | '商业险' | '综合';

  export interface Policy {
    id?: number;
    policy_number: string;
    customer_id: number;
    vehicle_id: number;
    insurance_type: InsuranceType;
    premium: number;
    sum_insured: number;
    // 后端 start_date/end_date 与 effective_date/expiry_date 双写，前端统一用后者
    effective_date?: null | string;
    expiry_date?: null | string;
    start_date?: null | string;
    end_date?: null | string;
    issue_time?: null | string;
    policy_date?: null | string;
    status: PolicyStatus;
    certificate_type?: null | string;
    certificate_number?: null | string;
    insurance_company?: null | string;
    contact_person?: null | string;
    contact_phone?: null | string;
    sales_person?: null | string;
    compulsory_detail?: null | string; // TEXT 存 JSON 字符串
    commercial_detail?: null | string; // TEXT 存 JSON 字符串
    remark?: null | string;
    created_at?: string;
    updated_at?: string;
    // 后端 JOIN 出来的嵌套对象（列表/详情）
    customer?: {
      id: number;
      name: string;
      phone: string;
      email?: null | string;
      id_number?: null | string;
    } | null;
    vehicle?: {
      id: number;
      plate_number: string;
      brand: string;
      model: string;
      year?: null | number;
      vin?: null | string;
    } | null;
  }

  export interface PageResult {
    data: Policy[];
    total: number;
    page: number;
    pageSize: number;
  }
}

/**
 * 保单列表
 * 后端返回 { data, total, page, pageSize }；vxe-grid 全局 proxyConfig 期望 { items, total }，这里做一次映射，
 * 并把嵌套的 customer/vehicle 拍平出 customer_name / customer_phone / plate_number 等字段方便表格直显。
 */
export async function getPolicyList(params: Recordable<any>) {
  const res = await requestClient.get<PolicyApi.PageResult>('/policies', {
    params,
  });
  return {
    items: res.data.map((p) => ({
      ...p,
      customer_name: p.customer?.name,
      customer_phone: p.customer?.phone,
      plate_number: p.vehicle?.plate_number,
      vehicle_brand: p.vehicle?.brand,
      vehicle_model: p.vehicle?.model,
    })),
    total: res.total,
  };
}

export function getPolicy(id: number) {
  return requestClient.get<PolicyApi.Policy>(`/policies/${id}`);
}

export function createPolicy(data: Recordable<any>) {
  return requestClient.post<PolicyApi.Policy>('/policies', data);
}

/** 录入页聚合提交：一次性 upsert 客户(按手机号)+ 车辆(按车牌) + 新建保单 */
export function createPolicyFull(data: Recordable<any>) {
  return requestClient.post('/policies/full', data);
}

export function updatePolicy(id: number, data: Recordable<any>) {
  return requestClient.put<PolicyApi.Policy>(`/policies/${id}`, data);
}

/** 变更保单状态（激活/退保等）。RequestClient 无 patch 方法，用通用 request 发 PATCH */
export function updatePolicyStatus(id: number, status: PolicyApi.PolicyStatus) {
  return requestClient.request<PolicyApi.Policy>(`/policies/${id}/status`, {
    data: { status },
    method: 'PATCH',
  });
}

export function deletePolicy(id: number) {
  return requestClient.delete(`/policies/${id}`);
}
