import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace PolicyApi {
  /** 保单状态（与后端 policy.status CHECK 约束一致） */
  export type PolicyStatus = '生效' | '待生效' | '已过期' | '已退保';
  /** 险种（与后端 policy.insurance_type CHECK 约束一致） */
  export type InsuranceType = '交强险' | '商业险' | '综合';

  export interface Policy {
    id?: number;
    policyNumber: string;
    customerId: number;
    vehicleId: number;
    insuranceType: InsuranceType;
    premium: number;
    sumInsured: number;
    // 后端 start/end 与 effective/expiry 双写，前端统一用后者
    effectiveDate?: null | string;
    expiryDate?: null | string;
    startDate?: null | string;
    endDate?: null | string;
    issueTime?: null | string;
    policyDate?: null | string;
    status: PolicyStatus;
    certificateType?: null | string;
    certificateNumber?: null | string;
    insuranceCompany?: null | string;
    contactPerson?: null | string;
    contactPhone?: null | string;
    salesPerson?: null | string;
    compulsoryDetail?: null | string; // TEXT 存 JSON 字符串
    commercialDetail?: null | string; // TEXT 存 JSON 字符串
    remark?: null | string;
    // 保费拆分
    trafficPremium?: null | number;
    travelTax?: null | number;
    commercialPremium?: null | number;
    surchargePremium?: null | number;
    surchargePremium2?: null | number;
    // 手续费与支出
    commission?: null | number;
    expenses?: null | number;
    trafficRate?: null | number;
    trafficCharge?: null | number;
    commercialRate?: null | number;
    commercialCharge?: null | number;
    surchargeRate?: null | number;
    surchargeCharge?: null | number;
    surchargeRate2?: null | number;
    surchargeCharge2?: null | number;
    totalCharge?: null | number;
    // 材料文件 URL（COS）
    quotation?: null | string; // 其他承保材料（图片）
    policyFile?: null | string; // 电子保单（doc/pdf）
    createdAt?: string;
    updatedAt?: string;
    // 后端 JOIN 出来的嵌套对象（列表/详情）
    customer?: null | {
      address?: null | string;
      birthday?: null | string;
      businessArea?: null | string;
      businessAttribution?: null | string;
      businessLicense?: null | string;
      customerType?: null | string;
      email?: null | string;
      followStatus?: null | string;
      id: number;
      idAuthority?: null | string;
      idNumber?: null | string;
      idValidDate?: null | string;
      name: string;
      phone: string;
      ssnBack?: null | string;
      ssnFront?: null | string;
    };
    vehicle?: null | {
      brand: string;
      brandModel?: null | string;
      certificateDate?: null | string;
      drivingBack?: null | string;
      drivingFront?: null | string;
      energyType?: null | string;
      engineNumber?: null | string;
      id: number;
      loadCapacity?: null | number;
      model: string;
      nextInspectionDate?: null | string;
      plateNumber: string;
      registerDate?: null | string;
      seats?: null | number;
      transferFlag?: null | string;
      vehicleType?: null | string;
      vin?: null | string;
      year?: null | number;
    };
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
 * 响应拦截器已解包；这里再把嵌套 customer/vehicle 拍平出 customerName / plateNumber 等方便表格直显。
 */
export async function getPolicyList(params: Recordable<any>) {
  const res = await requestClient.get<PolicyApi.PageResult>('/policies', {
    params,
  });
  return {
    items: res.data.map((p) => ({
      ...p,
      customerName: p.customer?.name,
      customerPhone: p.customer?.phone,
      plateNumber: p.vehicle?.plateNumber,
      vehicleBrand: p.vehicle?.brand,
      vehicleModel: p.vehicle?.model,
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
