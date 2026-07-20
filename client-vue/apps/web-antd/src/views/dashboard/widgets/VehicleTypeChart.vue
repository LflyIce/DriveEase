<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDashboardData } from '../useDashboardData';
import { C_AQUA } from './constants';
import { useChartCarousel } from './useChartCarousel';

/** 车辆类型统计（横向柱状图） */
const chartRef = ref();
const { renderEcharts, getChartInstance } = useEcharts(chartRef);
const carousel = useChartCarousel(getChartInstance);
const { stats } = useDashboardData();

async function render(s: StatsApi.Dashboard | undefined) {
  if (!s) return;
  const vt = s.vehicleTypeStats ?? [];
  await renderEcharts({
    color: [C_AQUA],
    grid: { bottom: 20, left: 110, right: 48, top: 20 },
    // className 供全局 CSS 压低 tooltip 层级（默认 9999999 会盖住弹窗）
    tooltip: {
      axisPointer: { type: 'shadow' },
      className: 'chart-tooltip',
      trigger: 'axis',
    },
    yAxis: { name: '单', type: 'value' },
    xAxis: {
      data: vt.map((v) => v.name),
      inverse: true,
      type: 'category',
    },
    series: [
      {
        barMaxWidth: 30,
        data: vt.map((v) => v.value),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: C_AQUA },
        label: { position: 'right', show: false },
        name: '车辆数',
        type: 'bar',
      },
    ],
  });
  carousel.start(vt.length);
}

watch(stats, render);
// 同 EmployeeChart：immediate 会在 mounted 前静默失败，onMounted 补首次渲染
onMounted(() => render(stats.value));
</script>

<template>
  <EchartsUI ref="chartRef" height="100%" width="100%" />
</template>
