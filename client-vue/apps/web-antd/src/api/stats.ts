import { requestClient } from '#/api/request';

export namespace StatsApi {
  export interface Dashboard {
    customerCount: number;
    vehicleCount: number;
    policyCount: number;
    activePolicies: number;
    expiringPolicies: number;
    monthlyNewPolicies: number;
  }
}

export function getDashboardStats() {
  return requestClient.get<StatsApi.Dashboard>('/stats/dashboard');
}
