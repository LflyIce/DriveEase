import { requestClient } from '#/api/request';

export namespace StatsApi {
  export interface NameValue {
    name: string;
    value: number;
  }

  /** 车保/非车分列口径：KPI 与图表各自独立，不合并 */
  export interface Dashboard {
    // KPI
    todayVehiclePolicyCount: number; // 今日车保单数（今天投保且生效）
    todayNonVehicleCount: number; // 今日非车单数（今天创建）
    trafficPremiumTotal: number; // 交强险保费（车保）
    commercialPremiumTotal: number; // 商业险保费（车保）
    vehicleSumInsuredTotal: number; // 车保保额
    nonVehicleSumInsuredTotal: number; // 非车保额
    // 图表
    employeeRanking: { name: string; nonVehicle: number; vehicle: number }[];
    vehicleTypeStats: NameValue[]; // 车保专属
    insuranceMix: NameValue[]; // 险种占比（车保专属）
    premiumMix: {
      commercial: number;
      nonVehiclePremium: number; // 非车保单保费
      surcharge: number; // 随车非车险（车保单上的 surcharge 两列合计）
      traffic: number;
    };
    premiumTrend: { month: string; nonVehicle: number; vehicle: number }[];
  }
}

export function getDashboardStats() {
  return requestClient.get<StatsApi.Dashboard>('/stats/dashboard');
}
