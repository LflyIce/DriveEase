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
  exportNonVehiclePolicies,
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

/** 导出中 */
const exporting = ref(false);
/** 最近一次列表查询的表单值（导出复用同一筛选条件） */
let lastFormValues: Record<string, any> = {};

/** 列表/导出共用查询参数：RangePicker 拆成 createdStart/createdEnd 日期 */
function buildQueryParams(formValues: Record<string, any>) {
  const { createdRange, ...rest } = formValues ?? {};
  const [start, end] = createdRange ?? [];
  return {
    ...rest,
    expiryWithin: expiryWithin.value,
    createdStart: start ? dayjs(start).format('YYYY-MM-DD') : undefined,
    createdEnd: end ? dayjs(end).format('YYYY-MM-DD') : undefined,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 导出当前查询到的数据（按筛选条件，非全表） */
async function onExport() {
  exporting.value = true;
  try {
    const blob = await exportNonVehiclePolicies(
      buildQueryParams(lastFormValues),
    );
    downloadBlob(blob, `非车保单_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
  } catch (e: any) {
    message.error(e?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
}

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
          lastFormValues = formValues as Record<string, any>;
          const res = await getNonVehiclePolicyList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...buildQueryParams(lastFormValues),
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

/** 编辑：复用开单抽屉（quick-create.vue 双模式） */
function onEdit(row: NonVehiclePolicyApi.NonVehiclePolicy) {
  quickCreateRef.value?.show(row);
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
          <!-- 导出：按当前查询条件导出 Excel（nonvehicle:export 权限） -->
          <Button
            v-access:code="['nonvehicle:export']"
            :loading="exporting"
            @click="onExport"
          >
            <template #icon>
              <IconifyIcon icon="ant-design:download-outlined" />
            </template>
            导出
          </Button>
        </div>
      </template>

      <template #endDate="{ row }">
        <span :style="{ color: endDateColor(row) }">{{ row.endDate }}</span>
      </template>

      <template #action="{ row }">
        <Button type="link" @click="onView(row)">查看</Button>
        <Button
          v-access:code="['nonvehicle:update']"
          type="link"
          @click="onEdit(row)"
        >
          编辑
        </Button>
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
