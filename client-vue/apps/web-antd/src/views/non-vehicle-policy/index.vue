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

// 保费/支出/结余合计：后端按当前筛选条件全量聚合随列表返回（非当前页小计）
const premiumSum = ref(0);
const expensesSum = ref(0);
const balanceSum = ref(0);

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
            createdStart: start ? dayjs(start).format('YYYY-MM-DD') : undefined,
            createdEnd: end ? dayjs(end).format('YYYY-MM-DD') : undefined,
          });
          premiumSum.value = res.premiumSum ?? 0;
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
