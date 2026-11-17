<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { openFilePreview } from './file-preview';

/**
 * 非图片文件卡片（pdf/doc 等）：大图标 + 类型标识，点击新标签预览。
 * 尺寸由外层 class 决定（如 h-24 w-24 / h-[90px] w-[120px]）。
 */
const props = withDefaults(
  defineProps<{
    /** 文件 URL */
    url: string;
    /** 自定义名称（如「电子保单」）；不传按扩展名显示 PDF/Word/文件 */
    label?: string;
    /** 多张时的序号角标（1 起，0/undefined 不显示） */
    index?: number;
  }>(),
  { index: 0, label: '' },
);

const kind = computed(() => {
  if (/\.pdf(\?|#|$)/i.test(props.url)) {
    return { color: '#ff4d4f', icon: 'ant-design:file-pdf-outlined', text: 'PDF' };
  }
  if (/\.(doc|docx)(\?|#|$)/i.test(props.url)) {
    return { color: '#1677ff', icon: 'ant-design:file-word-outlined', text: 'Word' };
  }
  return { color: '#8c8c8c', icon: 'ant-design:file-outlined', text: '文件' };
});
</script>

<template>
  <a
    :href="url"
    target="_blank"
    class="relative flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 bg-white px-2 text-center transition-colors hover:border-blue-400"
    @click.prevent="openFilePreview(url)"
  >
    <span
      v-if="index"
      class="absolute right-1 top-1 rounded-full bg-blue-500 px-1.5 text-[10px] leading-4 text-white"
    >
      {{ index }}
    </span>
    <IconifyIcon
      :height="28"
      :icon="kind.icon"
      :style="{ color: kind.color }"
      :width="28"
    />
    <span class="text-xs text-gray-600">{{ label || kind.text }}</span>
  </a>
</template>
