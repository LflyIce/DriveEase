<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { PolicyApi } from '#/api/policy';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Button, message, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deletePolicy, getPolicyList, updatePolicyStatus } from '#/api/policy';

import DetailDrawer from './modules/detail.vue';
import { useColumns, useGridFormSchema } from './data';

defineOptions({ name: 'Policy' });

/** 状态 → 标签颜色（生效绿/待生效蓝/已过期灰/已退保红，遵 CLAUDE.md 状态色约定） */
const STATUS_COLOR: Record<string, string> = {
  生效: 'green',
  待生效: 'blue',
  已过期: 'default',
  已退保: 'red',
};

const detailRef = ref();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getPolicyList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<PolicyApi.Policy>,
});

function onView(row: PolicyApi.Policy) {
  detailRef.value?.show(row.id);
}

function onActivate(row: PolicyApi.Policy) {
  updatePolicyStatus(row.id!, '生效').then(() => {
    message.success('已激活');
    gridApi.query();
  });
}

function onSurrender(row: PolicyApi.Policy) {
  updatePolicyStatus(row.id!, '已退保').then(() => {
    message.success('已退保');
    gridApi.query();
  });
}

function onDelete(row: PolicyApi.Policy) {
  deletePolicy(row.id!).then(() => {
    message.success('删除成功');
    gridApi.query();
  });
}
</script>

<template>
  <Page auto-content-height>
    <DetailDrawer ref="detailRef" />

    <Grid table-title="保单管理">
      <template #status="{ row }">
        <Tag :color="STATUS_COLOR[row.status]">{{ row.status }}</Tag>
      </template>

      <template #action="{ row }">
        <Button type="link" @click="onView(row)">查看</Button>
        <Button
          v-if="row.status === '待生效'"
          type="link"
          @click="onActivate(row)"
        >
          激活
        </Button>
        <Button
          v-if="row.status === '生效'"
          type="link"
          danger
          @click="onSurrender(row)"
        >
          退保
        </Button>
        <Popconfirm title="确认删除该保单？" @confirm="onDelete(row)">
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
