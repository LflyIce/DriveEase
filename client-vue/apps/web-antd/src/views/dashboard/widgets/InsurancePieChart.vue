<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDashboardData } from '../useDashboardData';
import { CHART_COLORS } from './constants';
import { useChartCarousel } from './useChartCarousel';

/** 险种占比（环形饼图，按保单数） */
const chartRef = ref();
const { renderEcharts, getChartInstance } = useEcharts(chartRef);
const carousel = useChartCarousel(getChartInstance);
const { stats } = useDashboardData();

async function render(s: StatsApi.Dashboard | undefined) {
  if (!s) return;
  await renderEcharts({
    color: CHART_COLORS,
    legend: { bottom: 0 },
    tooltip: { trigger: 'item' },
    series: [
      {
        center: ['50%', '45%'],
        data: (s.insuranceMix ?? []).map((i) => ({
          name: i.name,
          value: i.value,
        })),
        label: { formatter: '{b}: {d}%' },
        radius: ['45%', '70%'],
        type: 'pie',
      },
    ],
  });
  carousel.start((s.insuranceMix ?? []).length);
}

watch(stats, render);
// 同 EmployeeChart：immediate 会在 mounted 前静默失败，onMounted 补首次渲染
onMounted(() => render(stats.value));
</script>

<template>
  <EchartsUI ref="chartRef" height="100%" width="100%" />
</template>
