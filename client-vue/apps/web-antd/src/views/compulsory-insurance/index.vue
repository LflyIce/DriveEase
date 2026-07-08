<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { CompulsoryInsuranceApi } from '#/api/compulsory-insurance';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteCompulsoryInsurance,
  getCompulsoryInsuranceList,
} from '#/api/compulsory-insurance';

import FormModal from './modules/form.vue';
import { useColumns, useGridFormSchema } from './data';

defineOptions({ name: 'CompulsoryInsurance' });

const [FormModalComp, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { schema: useGridFormSchema() },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getCompulsoryInsuranceList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<CompulsoryInsuranceApi.Type>,
});

function onCreate() {
  formModalApi.setData({}).open();
}
function onEdit(row: CompulsoryInsuranceApi.Type) {
  formModalApi.setData(row).open();
}
function onDelete(row: CompulsoryInsuranceApi.Type) {
  deleteCompulsoryInsurance(row.id!).then(() => {
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

    <Grid table-title="交强险险种管理">
      <template #toolbar-tools>
        <Button type="primary" @click="onCreate">
          <Plus class="size-5" />
          新建
        </Button>
      </template>
      <template #action="{ row }">
        <Button type="link" @click="onEdit(row)">编辑</Button>
        <Popconfirm title="确认删除？" @confirm="onDelete(row)">
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
