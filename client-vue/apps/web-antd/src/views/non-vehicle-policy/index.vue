<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { NonVehiclePolicyApi } from '#/api/non-vehicle-policy';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Button, message, Popconfirm } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteNonVehiclePolicy,
  getNonVehiclePolicyList,
} from '#/api/non-vehicle-policy';

import { formatMoney, useColumns, useGridFormSchema } from './data';
import DetailDrawer from './modules/detail.vue';
import QuickCreateDrawer from './modules/quick-create.vue';

defineOptions({ name: 'NonVehiclePolicy' });

const detailRef = ref();
const quickCreateRef = ref();

// 保费/费用/支出/结余合计：后端按当前筛选条件全量聚合随列表返回（非当前页小计）
const premiumSum = ref(0);
const feeSum = ref(0);
const expensesSum = ref(0);
const balanceSum = ref(0);

/** 到期快捷筛选窗口（天）：undefined=不过滤；30=月内到期；10=10日内到期（同车保口径） */
const expiryWithin = ref<number | undefined>();

/**
 * 截止日期文字色：10日内到期红 / 月内(30天)到期橙，已过期或无日期默认。
 * 与到期快捷筛选 toggleExpiry 的 30/10 天口径一致。
 */
function endDateColor(row: NonVehiclePolicyApi.NonVehiclePolicy): string | undefined {
  if (!row.endDate) return undefined;
  const days = dayjs(row.endDate)
    .startOf('day')
    .diff(dayjs().startOf('day'), 'day');
  if (days < 0) return undefined; // 已过期 → 默认
  if (days <= 10) return 'var(--ant-colorError, #ff4d4f)';
  if (days <= 30) return 'var(--ant-colorWarning, #faad14)';
  return undefined;
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    commonConfig: { labelWidth: 60 },
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    footerMethod: ({ columns }) => [
      columns.map((col, idx) => {
        if (idx === 0) return '合计';
        if (col.field === 'premium') return formatMoney(premiumSum.value);
        if (col.field === 'fee') return formatMoney(feeSum.value);
        if (col.field === 'expenses') return formatMoney(expensesSum.value);
        if (col.field === 'balance') return formatMoney(balanceSum.value);
        return '';
      }),
    ],
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          // 创建时间 RangePicker 给 dayjs 数组，拆成后端的 createdStart/createdEnd 日期
          const { createdRange, ...rest } = formValues as Record<string, any>;
          const [start, end] = createdRange ?? [];
          const res = await getNonVehiclePolicyList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...rest,
            expiryWithin: expiryWithin.value,
            createdStart: start ? dayjs(start).format('YYYY-MM-DD') : undefined,
            createdEnd: end ? dayjs(end).format('YYYY-MM-DD') : undefined,
          });
          premiumSum.value = res.premiumSum ?? 0;
          feeSum.value = res.feeSum ?? 0;
          expensesSum.value = res.expensesSum ?? 0;
          balanceSum.value = res.balanceSum ?? 0;
          return res;
        },
      },
    },
    rowConfig: { keyField: 'id' },
    showFooter: true,
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<NonVehiclePolicyApi.NonVehiclePolicy>,
});

/** 切换到期快捷筛选：再点一次当前按钮 = 取消 */
function toggleExpiry(days: number) {
  expiryWithin.value = expiryWithin.value === days ? undefined : days;
  gridApi.query();
}

/** 极速开单：左侧抽屉（modules/quick-create.vue） */
function onQuickCreate() {
  quickCreateRef.value?.show();
}

function onView(row: NonVehiclePolicyApi.NonVehiclePolicy) {
  detailRef.value?.show(row.id!);
}

function onDelete(row: NonVehiclePolicyApi.NonVehiclePolicy) {
  deleteNonVehiclePolicy(row.id!).then(() => {
    message.success('删除成功');
    gridApi.query();
  });
}
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer ref="detailRef" />
    <QuickCreateDrawer ref="quickCreateRef" @success="() => gridApi.query()" />

    <Grid>
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <!-- 极速开单：主按钮 + 加号，左侧抽屉录入（nonvehicle:create 权限） -->
          <Button
            v-access:code="['nonvehicle:create']"
            type="primary"
            @click="onQuickCreate"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:plus-outlined" />
            </template>
            开单
          </Button>
          <!-- 月内到期：warning 橙 + 日历图标；激活实心（同车保） -->
          <Button
            class="btn-warn"
            :class="{ 'btn-warn-active': expiryWithin === 30 }"
            @click="toggleExpiry(30)"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:calendar-outlined" />
            </template>
            月内到期
          </Button>
          <!-- 10日内到期：danger 红 + 警告图标；激活转 primary+danger 实心红（同车保） -->
          <Button
            danger
            :type="expiryWithin === 10 ? 'primary' : 'default'"
            @click="toggleExpiry(10)"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:warning-outlined" />
            </template>
            10日内到期
          </Button>
        </div>
      </template>

      <template #endDate="{ row }">
        <span :style="{ color: endDateColor(row) }">{{ row.endDate }}</span>
      </template>

      <template #action="{ row }">
        <Button type="link" @click="onView(row)">查看</Button>
        <Popconfirm
          v-access:code="['nonvehicle:delete']"
          title="确认删除该非车保单？"
          @confirm="onDelete(row)"
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>

<style>
/* antd-vue 4.x Button 无原生 warning：用主题变量做描边橙；.ant-btn 叠加提升优先级（同车保） */
.btn-warn.ant-btn {
  color: var(--ant-colorWarning, #faad14);
  border-color: var(--ant-colorWarning, #faad14);
}

.btn-warn.ant-btn:not(:disabled):hover {
  color: var(--ant-colorWarning-hover, #ffc53d);
  border-color: var(--ant-colorWarning-hover, #ffc53d);
}

.btn-warn.btn-warn-active.ant-btn {
  color: #fff;
  background: var(--ant-colorWarning, #faad14);
  border-color: var(--ant-colorWarning, #faad14);
}
</style>
