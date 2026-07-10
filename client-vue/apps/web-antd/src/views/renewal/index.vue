<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { VbenFormSchema } from '#/adapter/form';
import type { RenewalApi } from '#/api/renewal';

import { Page } from '@vben/common-ui';
import { Button, message, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getRenewalList, renewRenewal } from '#/api/renewal';

defineOptions({ name: 'Renewal' });

const STATUS_OPTIONS = [
  { label: '待提醒', value: '待提醒' },
  { label: '已提醒', value: '已提醒' },
  { label: '已续保', value: '已续保' },
  { label: '已过期', value: '已过期' },
];

const STATUS_COLOR: Record<string, string> = {
  已提醒: 'blue',
  已过期: 'default',
  已续保: 'green',
  待提醒: 'orange',
};

const formSchema: VbenFormSchema[] = [
  {
    component: 'Select',
    componentProps: { allowClear: true, options: STATUS_OPTIONS },
    fieldName: 'status',
    label: '状态',
  },
];

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: formSchema },
  gridOptions: {
    columns: [
      { field: 'id', title: 'ID', width: 70 },
      { field: 'oldPolicyNumber', title: '原保单号', width: 150 },
      { field: 'customerName', title: '客户', width: 100 },
      { field: 'plateNumber', title: '车牌', width: 100 },
      { field: 'remindDate', title: '提醒日期', width: 120 },
      {
        align: 'center',
        field: 'status',
        slots: { default: 'status' },
        title: '状态',
        width: 100,
      },
      { field: 'newPolicyNumber', title: '新保单号', width: 150 },
      { field: 'note', title: '备注', minWidth: 180 },
      {
        align: 'center',
        field: 'operation',
        fixed: 'right',
        slots: { default: 'action' },
        title: '操作',
        width: 100,
      },
    ],
    height: 'auto',
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getRenewalList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<RenewalApi.Renewal>,
});

function onRenew(row: RenewalApi.Renewal) {
  renewRenewal(row.id).then((res) => {
    message.success(`续保成功，新保单：${res?.newPolicy?.policyNumber ?? ''}`);
    gridApi.query();
  });
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="续保管理">
      <template #status="{ row }">
        <Tag :color="STATUS_COLOR[row.status] ?? 'default'">
          {{ row.status }}
        </Tag>
      </template>
      <template #action="{ row }">
        <Popconfirm
          v-if="row.status === '待提醒' || row.status === '已提醒'"
          title="确认执行续保？将自动生成新保单。"
          @confirm="onRenew(row)"
        >
          <Button type="link">续保</Button>
        </Popconfirm>
        <span v-else class="text-gray-400">—</span>
      </template>
    </Grid>
  </Page>
</template>
