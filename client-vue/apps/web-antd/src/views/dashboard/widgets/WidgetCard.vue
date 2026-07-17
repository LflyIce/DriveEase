<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Card } from 'ant-design-vue';

/**
 * 仪表盘 widget 统一外壳：标题栏 + 内容区（撑满 gridstack item）。
 * 编辑态浮层：整个浮层即拖拽手柄（gridstack 拖 DOM），右上角为移除按钮。
 */
interface Props {
  editing?: boolean;
  hideHeader?: boolean;
  title?: string;
}

withDefaults(defineProps<Props>(), {
  editing: false,
  hideHeader: false,
  title: '',
});

defineEmits<{ remove: [] }>();
</script>

<template>
  <div class="relative h-full w-full">
    <Card
      class="widget-card h-full"
      :body-style="{
        padding: '12px',
        height: hideHeader ? '100%' : 'calc(100% - 48px)',
        overflow: 'hidden',
      }"
    >
      <template v-if="!hideHeader" #title>{{ title }}</template>
      <slot />
    </Card>
    <!-- 编辑态浮层：拦截图表交互 + 充当拖拽区 -->
    <div v-if="editing" class="widget-edit-mask">
      <button
        class="widget-remove-btn"
        title="移除卡片"
        type="button"
        @click.stop="$emit('remove')"
      >
        <IconifyIcon icon="lucide:x" class="size-4" />
      </button>
      <IconifyIcon icon="lucide:grip" class="widget-drag-icon size-6" />
    </div>
  </div>
</template>

<style scoped>
.widget-card :deep(.ant-card-head) {
  min-height: 48px;
}

.widget-edit-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  background: hsl(var(--muted, 0 0% 50% / 0.08));
  border: 1px dashed hsl(var(--primary, 221 83% 53% / 0.4));
  border-radius: 8px;
}

.widget-drag-icon {
  opacity: 0.35;
  pointer-events: none;
}

.widget-remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  background: rgb(0 0 0 / 55%);
  color: #fff;
  border: none;
  border-radius: 50%;
}

.widget-remove-btn:hover {
  background: #e34948;
}
</style>
