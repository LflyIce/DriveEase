<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';
import type { RenewalApi } from '#/api/renewal';

import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Card, Col, Row, Spin, Table, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getUpcomingRenewals } from '#/api/renewal';
import { getDashboardStats } from '#/api/stats';

defineOptions({ name: 'Dashboard' });

const stats = ref<StatsApi.Dashboard>();
const upcoming = ref<RenewalApi.Renewal[]>([]);
const loading = ref(false);

// ---- 图表 ----
const trendRef = ref();
const pieRef = ref();
const { renderEcharts: renderTrend } = useEcharts(trendRef);
const { renderEcharts: renderPie } = useEcharts(pieRef);

const STATUS_COLOR: Record<string, string> = {
  已提醒: 'blue',
  已过期: 'default',
  已续保: 'green',
  待提醒: 'orange',
};

const cards = computed(() => [
  {
    bg: '#e6f4ff',
    color: '#1677ff',
    icon: 'lucide:users',
    key: 'customer',
    sub: '累计客户数',
    title: '客户总数',
    value: stats.value?.customerCount ?? 0,
  },
  {
    bg: '#e6fffb',
    color: '#13c2c2',
    icon: 'lucide:car',
    key: 'vehicle',
    sub: '累计车辆数',
    title: '车辆总数',
    value: stats.value?.vehicleCount ?? 0,
  },
  {
    bg: '#f9f0ff',
    color: '#722ed1',
    icon: 'lucide:file-text',
    key: 'policy',
    sub: `本月新增 ${stats.value?.monthlyNewPolicies ?? 0}`,
    title: '保单总数',
    value: stats.value?.policyCount ?? 0,
  },
  {
    bg: '#f6ffed',
    color: '#52c41a',
    icon: 'lucide:shield-check',
    key: 'active',
    sub: `30 天内到期 ${stats.value?.expiringPolicies ?? 0}`,
    title: '生效保单',
    value: stats.value?.activePolicies ?? 0,
  },
]);

// 假数据：近 6 个月保费收入趋势
const trendMonths = Array.from({ length: 6 }, (_, i) =>
  dayjs().subtract(5 - i, 'month').format('M月'),
);
const trendValues = [45_200, 58_300, 49_800, 67_100, 62_400, 71_500];

// 假数据：险种占比
const pieData = [
  { name: '综合险', value: 45 },
  { name: '商业险', value: 35 },
  { name: '交强险', value: 20 },
];

const renewalColumns = [
  {
    title: '原保单号',
    key: 'policy',
    customRender: ({ record }) => record.oldPolicy?.policyNumber ?? '—',
  },
  {
    title: '客户',
    key: 'customer',
    customRender: ({ record }) => record.oldPolicy?.customer?.name ?? '—',
  },
  {
    title: '车牌',
    key: 'plate',
    customRender: ({ record }) => record.oldPolicy?.vehicle?.plateNumber ?? '—',
  },
  { dataIndex: 'remindDate', key: 'remind', title: '提醒日期' },
  {
    key: 'status',
    title: '状态',
    customRender: ({ record }) =>
      h(
        Tag,
        { color: STATUS_COLOR[record.status] ?? 'default' },
        () => record.status,
      ),
  },
];

async function load() {
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

  renderTrend({
    areaStyle: { opacity: 0.15 },
    color: ['#1677ff'],
    grid: { bottom: 30, left: 50, right: 20, top: 30 },
    itemStyle: { color: '#1677ff' },
    lineStyle: { width: 3 },
    series: [
      {
        areaStyle: { opacity: 0.15 },
        data: trendValues,
        itemStyle: { color: '#1677ff' },
        lineStyle: { width: 3 },
        name: '保费收入',
        smooth: true,
        type: 'line',
      },
    ],
    tooltip: { trigger: 'axis' },
    xAxis: { boundaryGap: false, data: trendMonths, type: 'category' },
    yAxis: { name: '元', type: 'value' },
  });

  renderPie({
    color: ['#722ed1', '#1677ff', '#13c2c2'],
    legend: { bottom: 0 },
    series: [
      {
        center: ['50%', '45%'],
        data: pieData,
        label: { formatter: '{b}: {d}%' },
        radius: ['45%', '70%'],
        type: 'pie',
      },
    ],
    tooltip: { trigger: 'item' },
  });
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <!-- 顶部 KPI 卡片 -->
      <Row :gutter="[24, 24]">
        <Col v-for="c in cards" :key="c.key" :lg="6" :md="12" :xs="24">
          <Card class="mb-6">
            <div class="flex items-center gap-4">
              <div
                class="flex size-14 items-center justify-center rounded-2xl"
                :style="{ background: c.bg }"
              >
                <IconifyIcon
                  :icon="c.icon"
                  :style="{ color: c.color }"
                  class="size-7"
                />
              </div>
              <div>
                <div
                  class="text-2xl font-semibold leading-tight"
                  :style="{ color: c.color }"
                >
                  {{ c.value }}
                </div>
                <div class="text-sm text-gray-700">{{ c.title }}</div>
                <div class="mt-0.5 text-xs text-gray-400">{{ c.sub }}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- 图表区 -->
      <Row :gutter="[24, 24]">
        <Col :lg="16" :xs="24">
          <Card class="mb-6" title="近 6 个月保费收入趋势">
            <EchartsUI ref="trendRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="8" :xs="24">
          <Card class="mb-6" title="险种占比">
            <EchartsUI ref="pieRef" height="320px" />
          </Card>
        </Col>
      </Row>

      <!-- 续保提醒 -->
      <Card title="未来 30 天续保提醒">
        <Table
          :columns="renewalColumns"
          :data-source="upcoming"
          :pagination="false"
          row-key="id"
          size="small"
        />
      </Card>
    </Spin>
  </Page>
</template>
