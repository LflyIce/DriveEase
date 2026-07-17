import type { InjectionKey, Ref } from 'vue';

import type { RenewalApi } from '#/api/renewal';
import type { StatsApi } from '#/api/stats';

import { inject, onMounted, provide, ref } from 'vue';

import { getUpcomingRenewals } from '#/api/renewal';
import { getDashboardStats } from '#/api/stats';

/**
 * 仪表盘数据层：stats + upcoming 只请求一次，provide 给所有 widget。
 * widget 通过 useDashboardData() inject（watch stats 渲染，支持后挂载的 widget）。
 */
export interface DashboardData {
  loading: Ref<boolean>;
  reload: () => Promise<void>;
  stats: Ref<StatsApi.Dashboard | undefined>;
  upcoming: Ref<RenewalApi.Renewal[]>;
}

const key: InjectionKey<DashboardData> = Symbol('dashboard-data');

export function provideDashboardData(): DashboardData {
  const stats = ref<StatsApi.Dashboard>();
  const upcoming = ref<RenewalApi.Renewal[]>([]);
  const loading = ref(false);

  async function reload() {
    loading.value = true;
    try {
      const [s, u] = await Promise.all([
        getDashboardStats(),
        getUpcomingRenewals(),
      ]);
      stats.value = s;
      upcoming.value = u;
    } finally {
      loading.value = false;
    }
  }

  const data: DashboardData = { loading, reload, stats, upcoming };
  provide(key, data);
  onMounted(reload);
  return data;
}

export function useDashboardData(): DashboardData {
  const d = inject(key);
  if (!d) throw new Error('useDashboardData: 未找到 provideDashboardData');
  return d;
}
