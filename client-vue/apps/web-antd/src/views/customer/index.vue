<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CustomerApi } from '#/api/customer';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteCustomer, getCustomerList } from '#/api/customer';

import FormModal from './modules/form.vue';
import { useColumns, useGridFormSchema } from './data';

defineOptions({ name: 'Customer' });

const [FormModalComp, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    commonConfig: { labelWidth: 60 },
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getCustomerList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<CustomerApi.Customer>,
});

function onCreate() {
  formModalApi.setData({}).open();
}

function onEdit(row: CustomerApi.Customer) {
  formModalApi.setData(row).open();
}

function onDelete(row: CustomerApi.Customer) {
  deleteCustomer(row.id!).then(() => {
    message.success('删除成功');
    gridApi.query();
  });
}

function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <FormModalComp @success="onRefresh" />

    <Grid table-title="客户管理">
      <template #toolbar-tools>
        <Button v-access:code="['customer:create']" type="primary" @click="onCreate">
          <Plus class="size-5" />
          新建客户
        </Button>
      </template>

      <template #action="{ row }">
        <Button v-access:code="['customer:update']" type="link" @click="onEdit(row)">编辑</Button>
        <Popconfirm v-access:code="['customer:delete']" title="确认删除该客户？" @confirm="onDelete(row)">
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
