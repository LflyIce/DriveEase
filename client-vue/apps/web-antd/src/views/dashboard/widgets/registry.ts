import type { Component } from 'vue';

import type { DashboardConfigApi } from '#/api/dashboard-config';

import EmployeeChart from './EmployeeChart.vue';
import InsurancePieChart from './InsurancePieChart.vue';
import KpiCard from './KpiCard.vue';
import PremiumMixChart from './PremiumMixChart.vue';
import RenewalTable from './RenewalTable.vue';
import TrendChart from './TrendChart.vue';
import VehicleTypeChart from './VehicleTypeChart.vue';

/**
 * 仪表盘 widget 注册表：每个可放置卡片的元数据。
 * - defaultLayout 还原旧版硬编码布局的视觉效果（12 列 × 40px 行高）；
 * - hideHeader 的 widget（KPI）无标题栏，内容撑满；
 * - 新增 widget：在此注册 + 给 DEFAULT_LAYOUT 一个默认位即可被「添加卡片」发现。
 */
export interface WidgetDef {
  component: Component;
  defaultLayout: { h: number; w: number; x: number; y: number };
  hideHeader?: boolean;
  id: string;
  minH?: number;
  minW?: number;
  props?: Record<string, unknown>;
  title: string;
}

export const WIDGETS: Record<string, WidgetDef> = {
  'kpi-today-policy': {
    component: KpiCard,
    defaultLayout: { h: 2, w: 3, x: 0, y: 0 },
    hideHeader: true,
    id: 'kpi-today-policy',
    minH: 2,
    minW: 2,
    props: {
      bg: '#e6f4ff',
      color: '#1677ff',
      decimals: 0,
      icon: 'lucide:file-plus-2',
      title: '今日保单数',
      valueKey: 'todayPolicyCount',
    },
    title: '今日保单数',
  },
  'kpi-traffic-premium': {
    component: KpiCard,
    defaultLayout: { h: 2, w: 3, x: 3, y: 0 },
    hideHeader: true,
    id: 'kpi-traffic-premium',
    minH: 2,
    minW: 2,
    props: {
      bg: '#f6ffed',
      color: '#52c41a',
      decimals: 2,
      icon: 'lucide:shield-check',
      title: '交强险保费',
      valueKey: 'trafficPremiumTotal',
    },
    title: '交强险保费',
  },
  'kpi-commercial-premium': {
    component: KpiCard,
    defaultLayout: { h: 2, w: 3, x: 6, y: 0 },
    hideHeader: true,
    id: 'kpi-commercial-premium',
    minH: 2,
    minW: 2,
    props: {
      bg: '#fff7e6',
      color: '#fa8c16',
      decimals: 2,
      icon: 'lucide:briefcase',
      title: '商业险保费',
      valueKey: 'commercialPremiumTotal',
    },
    title: '商业险保费',
  },
  'kpi-sum-insured': {
    component: KpiCard,
    defaultLayout: { h: 2, w: 3, x: 9, y: 0 },
    hideHeader: true,
    id: 'kpi-sum-insured',
    minH: 2,
    minW: 2,
    props: {
      bg: '#f9f0ff',
      color: '#722ed1',
      decimals: 2,
      icon: 'lucide:landmark',
      title: '保额',
      valueKey: 'sumInsuredTotal',
    },
    title: '保额',
  },
  'chart-employee': {
    component: EmployeeChart,
    defaultLayout: { h: 8, w: 6, x: 0, y: 2 },
    id: 'chart-employee',
    minH: 5,
    minW: 3,
    title: '员工开单数',
  },
  'chart-trend': {
    component: TrendChart,
    defaultLayout: { h: 8, w: 6, x: 6, y: 2 },
    id: 'chart-trend',
    minH: 5,
    minW: 3,
    title: '近 6 个月保费收入趋势',
  },
  'chart-vehicle-type': {
    component: VehicleTypeChart,
    defaultLayout: { h: 8, w: 4, x: 0, y: 10 },
    id: 'chart-vehicle-type',
    minH: 5,
    minW: 3,
    title: '车辆类型统计',
  },
  'chart-insurance-pie': {
    component: InsurancePieChart,
    defaultLayout: { h: 8, w: 4, x: 4, y: 10 },
    id: 'chart-insurance-pie',
    minH: 5,
    minW: 3,
    title: '险种占比',
  },
  'chart-premium-mix': {
    component: PremiumMixChart,
    defaultLayout: { h: 8, w: 4, x: 8, y: 10 },
    id: 'chart-premium-mix',
    minH: 5,
    minW: 3,
    title: '保费占比',
  },
  'table-renewal': {
    component: RenewalTable,
    defaultLayout: { h: 8, w: 12, x: 0, y: 18 },
    id: 'table-renewal',
    minH: 4,
    minW: 4,
    title: '未来 30 天续保提醒',
  },
};

export type LayoutItem = DashboardConfigApi.LayoutItem;

/** 默认布局（注册表全量 widget 的默认位） */
export function getDefaultLayout(): LayoutItem[] {
  return Object.values(WIDGETS).map((w) => ({
    id: w.id,
    ...w.defaultLayout,
  }));
}
