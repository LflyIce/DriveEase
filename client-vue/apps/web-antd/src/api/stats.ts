import { requestClient } from '#/api/request';

export namespace StatsApi {
  export interface NameValue {
    name: string;
    value: number;
  }

  export interface Dashboard {
    // KPI
    todayPolicyCount: number;
    trafficPremiumTotal: number;
    commercialPremiumTotal: number;
    sumInsuredTotal: number;
    // 图表
    employeeRanking: NameValue[];
    vehicleTypeStats: NameValue[];
    insuranceMix: NameValue[];
    premiumMix: { traffic: number; commercial: number; surcharge: number };
    premiumTrend: { month: string; premium: number }[];
  }
}

export function getDashboardStats() {
  return requestClient.get<StatsApi.Dashboard>('/stats/dashboard');
}
