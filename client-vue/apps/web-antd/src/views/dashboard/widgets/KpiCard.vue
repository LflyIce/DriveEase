<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';

import { computed } from 'vue';

import { CountTo } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { useDashboardData } from '../useDashboardData';

/** KPI 数值卡：valueKey 指向 Dashboard 统计字段，由注册表 props 配置出 4 个实例 */
interface Props {
  bg: string;
  color: string;
  decimals?: number;
  icon: string;
  title: string;
  valueKey: keyof StatsApi.Dashboard;
}

const props = withDefaults(defineProps<Props>(), { decimals: 0 });

const { stats } = useDashboardData();
const value = computed(() => {
  const v = stats.value?.[props.valueKey];
  return typeof v === 'number' ? v : 0;
});
</script>

<template>
  <div class="flex h-full items-center gap-4">
    <div
      class="flex size-14 shrink-0 items-center justify-center rounded-2xl"
      :style="{ background: bg }"
    >
      <IconifyIcon :icon="icon" :style="{ color }" class="size-7" />
    </div>
    <div class="min-w-0">
      <div
        class="truncate text-2xl font-semibold leading-tight"
        :style="{ color }"
      >
        <CountTo :decimals="decimals" :duration="1500" :end-val="value" />
      </div>
      <div class="truncate text-sm text-gray-700 dark:text-gray-300">
        {{ title }}
      </div>
    </div>
  </div>
</template>
