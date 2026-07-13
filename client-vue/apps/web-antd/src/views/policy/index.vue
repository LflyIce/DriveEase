<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { PolicyApi } from '#/api/policy';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

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

/** 到期快捷筛选窗口（天）：undefined=不过滤；30=月内到期；10=10日内到期 */
const expiryWithin = ref<number | undefined>();

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    commonConfig: { labelWidth: 60 },
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
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
            expiryWithin: expiryWithin.value,
          }),
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: { custom: true, refresh: true, search: true, zoom: true },
  } as VxeTableGridOptions<PolicyApi.Policy>,
});

/** 切换到期快捷筛选：再点一次当前按钮 = 取消 */
function toggleExpiry(days: number) {
  expiryWithin.value = expiryWithin.value === days ? undefined : days;
  gridApi.query();
}

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

    <Grid>
      <template #toolbar-actions>
        <div class="flex items-center gap-2">
          <!-- 月内到期：warning 橙 + 日历图标；激活实心 -->
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
          <!-- 10日内到期：danger 红 + 警告图标；激活转 primary+danger 实心红 -->
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
        </div>
      </template>

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

<style>
/* antd-vue 4.x Button 无原生 warning：用主题变量做描边橙；.ant-btn 叠加提升优先级 */
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
