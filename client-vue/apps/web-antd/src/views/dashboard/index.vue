<script lang="ts" setup>
import type { StatsApi } from '#/api/stats';
import type { RenewalApi } from '#/api/renewal';

import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue';

import { CountTo, Page } from '@vben/common-ui';
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

// ---- 图表 refs ----
const trendRef = ref();
const employeeRef = ref();
const vehicleTypeRef = ref();
const insurancePieRef = ref();
const premiumMixRef = ref();
const { renderEcharts: renderTrend, getChartInstance: getTrend } =
  useEcharts(trendRef);
const { renderEcharts: renderEmployee, getChartInstance: getEmployee } =
  useEcharts(employeeRef);
const {
  renderEcharts: renderVehicleType,
  getChartInstance: getVehicleType,
} = useEcharts(vehicleTypeRef);
const {
  renderEcharts: renderInsurancePie,
  getChartInstance: getInsurancePie,
} = useEcharts(insurancePieRef);
const {
  renderEcharts: renderPremiumMix,
  getChartInstance: getPremiumMix,
} = useEcharts(premiumMixRef);

const STATUS_COLOR: Record<string, string> = {
  已提醒: 'blue',
  已过期: 'default',
  已续保: 'green',
  待提醒: 'orange',
};

// KPI：value 传原始数字给 CountTo 做滚动动画；金额类 decimals=2（千分位+两位小数，与原 money() 视觉一致）
const cards = computed(() => [
  {
    bg: '#e6f4ff',
    color: '#1677ff',
    decimals: 0,
    icon: 'lucide:file-plus-2',
    key: 'todayPolicy',
    title: '今日保单数',
    value: stats.value?.todayPolicyCount ?? 0,
  },
  {
    bg: '#f6ffed',
    color: '#52c41a',
    decimals: 2,
    icon: 'lucide:shield-check',
    key: 'trafficPremium',
    title: '交强险保费',
    value: stats.value?.trafficPremiumTotal ?? 0,
  },
  {
    bg: '#fff7e6',
    color: '#fa8c16',
    decimals: 2,
    icon: 'lucide:briefcase',
    key: 'commercialPremium',
    title: '商业险保费',
    value: stats.value?.commercialPremiumTotal ?? 0,
  },
  {
    bg: '#f9f0ff',
    color: '#722ed1',
    decimals: 2,
    icon: 'lucide:landmark',
    key: 'sumInsured',
    title: '保额',
    value: stats.value?.sumInsuredTotal ?? 0,
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

// ---- 图表自动轮播：每 interval ms 依次 highlight + showTip 一个数据项；mouseover 暂停、mouseout 恢复 ----
const carouselCleanups: Array<() => void> = [];
function startCarousel(
  getInstance: () => any,
  count: number,
  interval = 2500,
) {
  if (count <= 0) return;
  let idx = -1;
  let paused = false;
  const tick = () => {
    if (paused) return;
    const ins = getInstance();
    if (!ins) return;
    if (idx >= 0) {
      ins.dispatchAction({ type: 'downplay', seriesIndex: 0, dataIndex: idx });
    }
    idx = (idx + 1) % count;
    ins.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: idx });
    ins.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx });
  };
  const timer = setInterval(tick, interval);
  const onOver = () => {
    paused = true;
  };
  const onOut = () => {
    paused = false;
  };
  const ins = getInstance();
  ins?.on('mouseover', onOver);
  ins?.on('mouseout', onOut);
  carouselCleanups.push(() => {
    clearInterval(timer);
    ins?.off('mouseover', onOver);
    ins?.off('mouseout', onOut);
  });
}

onBeforeUnmount(() => carouselCleanups.forEach((fn) => fn()));

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
    await renderTrend({
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
    startCarousel(getTrend, months.length);

    // 员工开单数（柱）
    const emp = s.employeeRanking ?? [];
    await renderEmployee({
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
    startCarousel(getEmployee, emp.length);

    // 车辆类型（柱）
    const vt = s.vehicleTypeStats ?? [];
    await renderVehicleType({
      color: [C_AQUA],
      grid: { bottom: 20, left: 110, right: 48, top: 20 },
      tooltip: { axisPointer: { type: 'shadow' }, trigger: 'axis' },
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
    startCarousel(getVehicleType, vt.length);

    // 险种占比（饼，按保单数）
    await renderInsurancePie({
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
    startCarousel(getInsurancePie, (s.insuranceMix ?? []).length);

    // 保费占比（饼，交强/商业/非车）
    const pm = s.premiumMix ?? { commercial: 0, surcharge: 0, traffic: 0 };
    await renderPremiumMix({
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
    startCarousel(getPremiumMix, 3);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <Page auto-content-height content-class="p-2">
    <Spin :spinning="loading">
      <!-- KPI 卡 -->
      <Row :gutter="[12, 12]" class="mb-2">
        <Col v-for="c in cards" :key="c.key" :lg="6" :md="12" :xs="24">
          <Card :body-style="{ padding: '12px' }">
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
                  <CountTo
                    :decimals="c.decimals"
                    :duration="1500"
                    :end-val="c.value"
                  />
                </div>
                <div class="text-sm text-gray-700">{{ c.title }}</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- 员工开单 + 保费趋势 -->
      <Row :gutter="[12, 12]" class="mb-2">
        <Col :lg="12" :xs="24">
          <Card :body-style="{ padding: '12px' }" title="员工开单数">
            <EchartsUI ref="employeeRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="12" :xs="24">
          <Card :body-style="{ padding: '12px' }" title="近 6 个月保费收入趋势">
            <EchartsUI ref="trendRef" height="320px" />
          </Card>
        </Col>
      </Row>

      <!-- 车辆类型 + 险种占比 + 保费占比 -->
      <Row :gutter="[12, 12]" class="mb-2">
        <Col :lg="8" :xs="24">
          <Card :body-style="{ padding: '12px' }" title="车辆类型统计">
            <EchartsUI ref="vehicleTypeRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="8" :xs="24">
          <Card :body-style="{ padding: '12px' }" title="险种占比">
            <EchartsUI ref="insurancePieRef" height="320px" />
          </Card>
        </Col>
        <Col :lg="8" :xs="24">
          <Card :body-style="{ padding: '12px' }" title="保费占比">
            <EchartsUI ref="premiumMixRef" height="320px" />
          </Card>
        </Col>
      </Row>

      <!-- 续保提醒 -->
      <Card :body-style="{ padding: '12px' }" title="未来 30 天续保提醒">
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
