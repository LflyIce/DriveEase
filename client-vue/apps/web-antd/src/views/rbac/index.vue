<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RbacApi } from '#/api/rbac';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { Button, message, Popconfirm, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteRole, getRoleList } from '#/api/rbac';

import { useColumns } from './data';
import PermissionDrawer from './modules/permission-drawer.vue';
import RoleFormModal from './modules/role-form.vue';

defineOptions({ name: 'Rbac' });

const [RoleFormModalComp, roleFormApi] = useVbenModal({
  connectedComponent: RoleFormModal,
  destroyOnClose: true,
});

const [PermissionDrawerComp, permDrawerApi] = useVbenDrawer({
  connectedComponent: PermissionDrawer,
});

const [Grid, gridApi] = useVbenVxeGrid({
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async () => {
          const list = await getRoleList();
          return { items: list, total: list.length };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, zoom: true },
  } as VxeTableGridOptions<RbacApi.Role>,
});

function onCreate() {
  roleFormApi.setData({}).open();
}
function onEdit(row: RbacApi.Role) {
  roleFormApi.setData(row).open();
}
function onPermission(row: RbacApi.Role) {
  permDrawerApi.setData(row).open();
}
function onDelete(row: RbacApi.Role) {
  deleteRole(row.id).then(() => {
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
    <RoleFormModalComp @success="onRefresh" />
    <PermissionDrawerComp @success="onRefresh" />

    <Grid table-title="角色权限管理">
      <template #toolbar-tools>
        <Button type="primary" @click="onCreate">
          <Plus class="size-5" />
          新建角色
        </Button>
      </template>
      <template #builtIn="{ row }">
        <Tag v-if="row.isBuiltIn === 1" color="gold">内置</Tag>
        <Tag v-else color="default">自定义</Tag>
      </template>
      <template #permCount="{ row }">
        {{ row.permissions?.length ?? 0 }} 项
      </template>
      <template #action="{ row }">
        <Button type="link" @click="onPermission(row)">配置权限</Button>
        <Button
          type="link"
          :disabled="row.isBuiltIn === 1"
          @click="onEdit(row)"
        >
          编辑
        </Button>
        <Popconfirm
          v-if="row.isBuiltIn !== 1"
          title="确认删除该角色？"
          @confirm="onDelete(row)"
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>
      </template>
    </Grid>
  </Page>
</template>
