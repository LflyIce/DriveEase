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

// dataviz 已验证 CVD 的分类色板（固定序、不循环）
const C_BLUE = '#2a78d6';
const C_AQUA = '#1baf7a';
const CHART_COLORS = [
  C_BLUE,
  C_AQUA,
  '#eda100',
  '#008300',
  '#4a3aa7',
  '#e34948',
  '#e87ba4',
  '#eb6834',
];

const money = (n: number) =>
  (n ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ---- 图表 refs ----
const trendRef = ref();
const employeeRef = ref();
const vehicleTypeRef = ref();
const insurancePieRef = ref();
const premiumMixRef = ref();
const { renderEcharts: renderTrend } = useEcharts(trendRef);
const { renderEcharts: renderEmployee } = useEcharts(employeeRef);
const { renderEcharts: renderVehicleType } = useEcharts(vehicleTypeRef);
const { renderEcharts: renderInsurancePie } = useEcharts(insurancePieRef);
const { renderEcharts: renderPremiumMix } = useEcharts(premiumMixRef);

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
    icon: 'lucide:file-plus-2',
    key: 'todayPolicy',
    title: '当天保单数',
    value: stats.value?.todayPolicyCount ?? 0,
  },
  {
    bg: '#f6ffed',
    color: '#52c41a',
    icon: 'lucide:shield-check',
    key: 'trafficPremium',
    title: '交强险保费',
    value: money(stats.value?.trafficPremiumTotal ?? 0),
  },
  {
    bg: '#fff7e6',
    color: '#fa8c16',
    icon: 'lucide:briefcase',
    key: 'commercialPremium',
    title: '商业险保费',
    value: money(stats.value?.commercialPremiumTotal ?? 0),
  },
  {
    bg: '#f9f0ff',
    color: '#722ed1',
    icon: 'lucide:landmark',
    key: 'sumInsured',
    title: '保额',
    value: money(stats.value?.sumInsuredTotal ?? 0),
  },
]);

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

    // 保费趋势：前端补零（固定近 6 个月桶，缺数据月填 0）
    const months = Array.from({ length: 6 }, (_, i) =>
      dayjs().subtract(5 - i, 'month').format('YYYY-MM'),
    );
    const trendMap = new Map(
      (s.premiumTrend ?? []).map((t) => [t.month, t.premium]),
    );
    const trendValues = months.map((m) => trendMap.get(m) ?? 0);
    renderTrend({
      color: [C_BLUE],
      grid: { bottom: 30, left: 50, right: 20, top: 30 },
      tooltip: { trigger: 'axis' },
      xAxis: { boundaryGap: false, data: months, type: 'category' },
      yAxis: { name: '元', type: 'value' },
      series: [
        {
          areaStyle: { opacity: 0.15 },
          data: trendValues,
          itemStyle: { color: C_BLUE },
          lineStyle: { width: 3 },
          name: '保费收入',
          smooth: true,
          type: 'line',
        },
      ],
    });

    // 员工开单数（柱）
    const emp = s.employeeRanking ?? [];
    renderEmployee({
      color: [C_BLUE],
      grid: { bottom: 20, left: 90, right: 48, top: 20 },
      tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
      xAxis: { name: '单', type: 'value' },
      yAxis: {
        data: emp.map((e) => e.name),
        inverse: true,
        type: 'category',
      },
      series: [
        {
          barMaxWidth: 30,
          data: emp.map((e) => e.value),
          itemStyle: { borderRadius: [0, 4, 4, 0], color: C_BLUE },
          label: { position: 'right', show: true },
          name: '开单数',
          type: 'bar',
        },
      ],
    });

    // 车辆类型（柱）
    const vt = s.vehicleTypeStats ?? [];
    renderVehicleType({
      color: [C_AQUA],
      grid: { bottom: 20, left: 110, right: 48, top: 20 },
      tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
      xAxis: { name: '单', type: 'value' },
      yAxis: {
        data: vt.map((v) => v.name),
        inverse: true,
        type: 'category',
      },
      series: [
        {
          barMaxWidth: 30,
          data: vt.map((v) => v.value),
          itemStyle: { borderRadius: [0, 4, 4, 0], color: C_AQUA },
          label: { position: 'right', show: true },
          name: '车辆数',
          type: 'bar',
        },
      ],
    });

    // 险种占比（饼，按保单数）
    renderInsurancePie({
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

    // 保费占比（饼，交强/商业/非车）
    const pm = s.premiumMix ?? { commercial: 0, surcharge: 0, traffic: 0 };
    renderPremiumMix({
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
          radius: ['45%', '70%'],
          type: 'pie',
        },
      ],
    });
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <!-- KPI 卡 -->
      <Row :gutter="[24, 24]" class="mb-4">
        <Col v-for="c in cards" :key="c.key" :lg="6" :md="12" :xs="24">
          <Card>
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
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- 员工开单 + 保费趋势 -->
      <Row :gutter="[24, 24]" class="mb-4">
        <Col :lg="12" :xs="24">
          <Card title="员工开单数">
            <EchartsUI ref="employeeRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="12" :xs="24">
          <Card title="近 6 个月保费收入趋势">
            <EchartsUI ref="trendRef" height="320px" />
          </Card>
        </Col>
      </Row>

      <!-- 车辆类型 + 险种占比 + 保费占比 -->
      <Row :gutter="[24, 24]" class="mb-4">
        <Col :lg="8" :xs="24">
          <Card title="车辆类型统计">
            <EchartsUI ref="vehicleTypeRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="8" :xs="24">
          <Card title="险种占比">
            <EchartsUI ref="insurancePieRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="8" :xs="24">
          <Card title="保费占比">
            <EchartsUI ref="premiumMixRef" height="320px" />
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
