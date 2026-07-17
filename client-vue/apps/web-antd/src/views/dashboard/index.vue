<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Menu,
  MenuItem,
  Popover,
  Spin,
  Tooltip,
} from 'ant-design-vue';

import { provideDashboardData } from './useDashboardData';
import { useDashboardLayout } from './useDashboardLayout';
import { WIDGETS } from './widgets/registry';
import WidgetCard from './widgets/WidgetCard.vue';

import 'gridstack/dist/gridstack.min.css';

defineOptions({ name: 'Dashboard' });

// 数据层：stats/upcoming 加载一次，provide 给全部 widget
const { loading } = provideDashboardData();

// 布局层：布局状态 + gridstack 实例 + 自动保存
const gridEl = ref<HTMLElement>();
const addMenuOpen = ref(false);
const {
  addWidget,
  availableWidgets,
  editing,
  initGrid,
  layout,
  loadLayout,
  ready,
  removeWidget,
  resetDefault,
  saving,
} = useDashboardLayout();

onMounted(async () => {
  // 先确定布局（后端配置或默认），渲染 DOM 后再让 gridstack 接管，避免重排闪烁
  await loadLayout();
  await nextTick();
  if (gridEl.value) initGrid(gridEl.value);
});
</script>

<template>
  <Page auto-content-height content-class="p-2">
    <!-- 侧边浮动操作钮（不占布局空间）：预览态单个编辑钮，编辑态竖排展开 -->
    <div class="dashboard-fab">
      <template v-if="editing">
        <div v-if="saving" class="fab-saving" title="布局保存中…">
          <Spin size="small" />
        </div>
        <Popover
          v-if="availableWidgets.length > 0"
          v-model:open="addMenuOpen"
          placement="leftTop"
          trigger="click"
        >
          <template #content>
            <Menu
              class="fab-add-menu"
              @click="
                (info: { key: number | string }) => {
                  addWidget(String(info.key));
                  addMenuOpen = false;
                }
              "
            >
              <MenuItem v-for="w in availableWidgets" :key="w.id">
                {{ w.title }}
              </MenuItem>
            </Menu>
          </template>
          <Tooltip title="添加卡片" placement="left">
            <Button shape="circle" size="large" class="fab-btn">
              <IconifyIcon icon="lucide:plus" class="size-5" />
            </Button>
          </Tooltip>
        </Popover>
        <Tooltip title="恢复默认" placement="left">
          <Button shape="circle" size="large" class="fab-btn" @click="resetDefault">
            <IconifyIcon icon="lucide:rotate-ccw" class="size-5" />
          </Button>
        </Tooltip>
        <Tooltip title="完成" placement="left">
          <Button
            shape="circle"
            size="large"
            type="primary"
            class="fab-btn"
            @click="editing = false"
          >
            <IconifyIcon icon="lucide:check" class="size-5" />
          </Button>
        </Tooltip>
      </template>
      <Tooltip v-else title="编辑布局" placement="left">
        <Button
          shape="circle"
          size="large"
          type="primary"
          class="fab-btn"
          @click="editing = true"
        >
          <IconifyIcon icon="lucide:settings-2" class="size-5" />
        </Button>
      </Tooltip>
    </div>

    <!-- 网格：ready 前不渲染（避免默认布局闪烁后重排） -->
    <Spin :spinning="loading && !ready">
      <div v-if="ready" ref="gridEl" class="grid-stack">
        <div
          v-for="item in layout"
          :key="item.id"
          class="grid-stack-item"
          :gs-id="item.id"
          :gs-x="item.x"
          :gs-y="item.y"
          :gs-w="item.w"
          :gs-h="item.h"
          :gs-min-w="WIDGETS[item.id]?.minW"
          :gs-min-h="WIDGETS[item.id]?.minH"
        >
          <div class="grid-stack-item-content">
            <WidgetCard
              :title="WIDGETS[item.id]?.title"
              :editing="editing"
              :hide-header="WIDGETS[item.id]?.hideHeader"
              @remove="removeWidget(item.id)"
            >
              <component
                :is="WIDGETS[item.id]?.component"
                v-bind="WIDGETS[item.id]?.props ?? {}"
              />
            </WidgetCard>
          </div>
        </div>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
/* 侧边浮动按钮组：右侧垂直居中，不占用文档流空间 */
.dashboard-fab {
  position: fixed;
  top: 50%;
  right: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  transform: translateY(-50%);
}

.fab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
}

.fab-saving {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: hsl(var(--background, 0 0% 100%));
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
}

.fab-add-menu {
  min-width: 140px;
  border-inline-end: none !important;
}

.grid-stack-item-content {
  overflow: hidden;
}

/* 编辑态：gridstack 拖拽占位符样式 */
.grid-stack :deep(.grid-stack-placeholder > .placeholder-content) {
  background: hsl(221 83% 53% / 0.12);
  border: 1px dashed hsl(221 83% 53% / 0.5);
  border-radius: 8px;
}
</style>
