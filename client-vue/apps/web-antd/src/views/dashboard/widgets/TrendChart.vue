<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';

import { onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import dayjs from 'dayjs';

import { useDashboardData } from '../useDashboardData';
import { C_AQUA, C_BLUE } from './constants';
import { useChartCarousel } from './useChartCarousel';

/** 近 6 个月保费收入趋势（车保/非车两条面积折线，缺数据月前端补零） */
const chartRef = ref();
const { renderEcharts, getChartInstance } = useEcharts(chartRef);
const carousel = useChartCarousel(getChartInstance);
const { stats } = useDashboardData();

async function render(s: StatsApi.Dashboard | undefined) {
  if (!s) return;
  const months = Array.from({ length: 6 }, (_, i) =>
    dayjs().subtract(5 - i, 'month').format('YYYY-MM'),
  );
  const trendMap = new Map((s.premiumTrend ?? []).map((t) => [t.month, t]));
  await renderEcharts({
    color: [C_BLUE, C_AQUA],
    grid: { bottom: 30, left: 50, right: 20, top: 36 },
    legend: { right: 0, top: 0 },
    // className 供全局 CSS 压低 tooltip 层级（默认 9999999 会盖住弹窗）
    tooltip: { className: 'chart-tooltip', trigger: 'axis' },
    xAxis: { boundaryGap: false, data: months, type: 'category' },
    yAxis: { name: '元', type: 'value' },
    series: [
      {
        areaStyle: { opacity: 0.15 },
        data: months.map((m) => trendMap.get(m)?.vehicle ?? 0),
        itemStyle: { color: C_BLUE },
        lineStyle: { width: 3 },
        name: '车保',
        smooth: true,
        type: 'line',
      },
      {
        areaStyle: { opacity: 0.15 },
        data: months.map((m) => trendMap.get(m)?.nonVehicle ?? 0),
        itemStyle: { color: C_AQUA },
        lineStyle: { width: 3 },
        name: '非车',
        smooth: true,
        type: 'line',
      },
    ],
  });
  carousel.start(months.length);
}

watch(stats, render);
// 同 EmployeeChart：immediate 会在 mounted 前静默失败，onMounted 补首次渲染
onMounted(() => render(stats.value));
</script>

<template>
  <EchartsUI ref="chartRef" height="100%" width="100%" />
</template>
