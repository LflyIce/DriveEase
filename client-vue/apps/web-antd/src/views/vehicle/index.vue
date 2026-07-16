<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { VehicleApi } from '#/api/vehicle';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { Button, message, Popconfirm } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteVehicle, getVehicleList } from '#/api/vehicle';

import FormModal from './modules/form.vue';
import { useColumns, useGridFormSchema } from './data';

defineOptions({ name: 'Vehicle' });

const [FormModalComp, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
  destroyOnClose: true,
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: { commonConfig: { labelWidth: 60 }, schema: useGridFormSchema() },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) =>
          await getVehicleList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<VehicleApi.Vehicle>,
});

function onCreate() {
  formModalApi.setData({}).open();
}
function onEdit(row: VehicleApi.Vehicle) {
  formModalApi.setData(row).open();
}
function onDelete(row: VehicleApi.Vehicle) {
  deleteVehicle(row.id!).then(() => {
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

    <Grid table-title="车辆管理">
      <template #toolbar-tools>
        <Button v-access:code="['vehicle:create']" type="primary" @click="onCreate">
          <Plus class="size-5" />
          新建
        </Button>
      </template>
      <template #action="{ row }">
        <Button v-access:code="['vehicle:update']" type="link" @click="onEdit(row)">编辑</Button>
        <Popconfirm v-access:code="['vehicle:delete']" title="确认删除该车辆？" @confirm="onDelete(row)">
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
