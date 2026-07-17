import { requestClient } from '#/api/request';

/**
 * 仪表盘布局配置（per-user，存后端 user.dashboard_config）。
 * 布局语义对齐 gridstack：12 列栅格，x/y 格坐标，w/h 格数。
 */
export namespace DashboardConfigApi {
  export interface LayoutItem {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }

  export interface DashboardConfig {
    layout: LayoutItem[];
  }
}

/** 读当前用户仪表盘布局；后端无配置时返回 null（前端回退默认布局） */
export function getDashboardConfig() {
  return requestClient.get<DashboardConfigApi.DashboardConfig | null>(
    '/auth/me/dashboard-config',
  );
}

/** 保存当前用户仪表盘布局 */
export function saveDashboardConfig(layout: DashboardConfigApi.LayoutItem[]) {
  return requestClient.put('/auth/me/dashboard-config', { layout });
}
