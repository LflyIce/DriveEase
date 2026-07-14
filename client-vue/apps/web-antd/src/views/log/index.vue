<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { VbenFormSchema } from '#/adapter/form';
import type { LogApi } from '#/api/log';

import { Page } from '@vben/common-ui';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getLogList } from '#/api/log';

defineOptions({ name: 'Log' });

const formSchema: VbenFormSchema[] = [
  { component: 'Input', fieldName: 'operator', label: '操作人' },
  { component: 'Input', fieldName: 'action', label: '操作' },
];

const [Grid] = useVbenVxeGrid({
  formOptions: { commonConfig: { labelWidth: 60 }, schema: formSchema },
  gridOptions: {
    columns: [
      { field: 'id', title: 'ID', width: 70 },
      { field: 'operator', title: '操作人', width: 120 },
      { field: 'action', title: '操作', width: 140 },
      { field: 'target', title: '对象', width: 160 },
      { field: 'detail', title: '详情', minWidth: 220 },
      { field: 'result', title: '结果', width: 90 },
      { field: 'createdAt', title: '时间', width: 170 },
    ],
    height: 'auto',
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getLogList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<LogApi.Log>,
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="操作日志" />
  </Page>
</template>
