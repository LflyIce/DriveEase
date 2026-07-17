<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { useDashboardData } from '../useDashboardData';
import { C_BLUE } from './constants';
import { useChartCarousel } from './useChartCarousel';

/** 员工开单数（横向柱状图） */
const chartRef = ref();
const { renderEcharts, getChartInstance } = useEcharts(chartRef);
const carousel = useChartCarousel(getChartInstance);
const { stats } = useDashboardData();

async function render(s: StatsApi.Dashboard | undefined) {
  if (!s) return;
  const emp = s.employeeRanking ?? [];
  await renderEcharts({
    color: [C_BLUE],
    grid: { bottom: 20, left: 90, right: 48, top: 20 },
    tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
    yAxis: { name: '单数', type: 'value' },
    xAxis: {
      data: emp.map((e) => e.name),
      inverse: true,
      type: 'category',
    },
    series: [
      {
        barMaxWidth: 30,
        data: emp.map((e) => e.value),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: C_BLUE },
        name: '开单数',
        type: 'bar',
      },
    ],
  });
  carousel.start(emp.length);
}

watch(stats, render);
// 首次渲染不能用 watch immediate：setup 阶段组件未 mounted，useEcharts 的 isActive
// 仍为 false，renderEcharts 会静默跳过。onMounted 补首次（其注册晚于 useEcharts
// 的 onMounted，执行时 isActive 已为 true）。
onMounted(() => render(stats.value));
</script>

<template>
  <EchartsUI ref="chartRef" height="100%" width="100%" />
</template>
