<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDashboardData } from '../useDashboardData';
import { CHART_COLORS } from './constants';
import { useChartCarousel } from './useChartCarousel';

/** 保费占比（实心饼图：交强险/商业险/非车险） */
const chartRef = ref();
const { renderEcharts, getChartInstance } = useEcharts(chartRef);
const carousel = useChartCarousel(getChartInstance);
const { stats } = useDashboardData();

async function render(s: StatsApi.Dashboard | undefined) {
  if (!s) return;
  const pm = s.premiumMix ?? { commercial: 0, surcharge: 0, traffic: 0 };
  await renderEcharts({
    color: CHART_COLORS,
    legend: { bottom: 0 },
    tooltip: { trigger: 'item' },
    series: [
      {
        center: ['50%', '45%'],
        data: [
          { name: '交强险', value: pm.traffic },
          { name: '商业险', value: pm.commercial },
          { name: '非车险', value: pm.surcharge },
        ],
        label: { formatter: '{b}: {d}%' },
        radius: ['0', '70%'],
        type: 'pie',
      },
    ],
  });
  carousel.start(3);
}

watch(stats, render);
// 同 EmployeeChart：immediate 会在 mounted 前静默失败，onMounted 补首次渲染
onMounted(() => render(stats.value));
</script>

<template>
  <EchartsUI ref="chartRef" height="100%" width="100%" />
</template>
