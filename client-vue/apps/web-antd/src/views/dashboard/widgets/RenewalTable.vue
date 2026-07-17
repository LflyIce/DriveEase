<script lang="ts" setup>
import { h } from 'vue';

import { Table, Tag } from 'ant-design-vue';

import { useDashboardData } from '../useDashboardData';

/** 未来 30 天续保提醒表格 */
const { upcoming } = useDashboardData();

const STATUS_COLOR: Record<string, string> = {
  已提醒: 'blue',
  已过期: 'default',
  已续保: 'green',
  待提醒: 'orange',
};

const columns = [
  {
    title: '原保单号',
    key: 'policy',
    customRender: ({ record }: any) => record.oldPolicy?.policyNumber ?? '—',
  },
  {
    title: '客户',
    key: 'customer',
    customRender: ({ record }: any) => record.oldPolicy?.customer?.name ?? '—',
  },
  {
    title: '车牌',
    key: 'plate',
    customRender: ({ record }: any) =>
      record.oldPolicy?.vehicle?.plateNumber ?? '—',
  },
  { dataIndex: 'remindDate', key: 'remind', title: '提醒日期' },
  {
    key: 'status',
    title: '状态',
    customRender: ({ record }: any) =>
      h(
        Tag,
        { color: STATUS_COLOR[record.status] ?? 'default' },
        () => record.status,
      ),
  },
];
</script>

<template>
  <Table
    :columns="columns"
    :data-source="upcoming"
    :pagination="false"
    :scroll="{ y: 'calc(100% - 39px)' }"
    row-key="id"
    size="small"
  />
</template>
