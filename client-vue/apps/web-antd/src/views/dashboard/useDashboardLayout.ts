import type { GridStack, GridStackNode } from 'gridstack';

import { computed, nextTick, ref, watch } from 'vue';

import { useDebounceFn } from '@vueuse/core';
import { GridStack as GridStackClass } from 'gridstack';

import {
  getDashboardConfig,
  saveDashboardConfig,
} from '#/api/dashboard-config';

import type { LayoutItem } from './widgets/registry';

import { getDefaultLayout, WIDGETS } from './widgets/registry';

/**
 * 仪表盘布局状态机：布局数据 + gridstack 实例 + 编辑模式 + 自动持久化。
 * 数据流：gridstack 拖 DOM → change 事件同步回 layout → 防抖 PUT 后端；
 * 增删/重置走「Vue 改 layout → nextTick → gridstack API 接管/卸载 DOM」。
 */
export function useDashboardLayout() {
  const layout = ref<LayoutItem[]>([]);
  const editing = ref(false);
  /** 初始布局是否已确定（拉取后端配置完成）；index 据此渲染网格并 init */
  const ready = ref(false);
  const saving = ref(false);

  let grid: GridStack | null = null;

  /** 未放入布局的 widget（「添加卡片」候选） */
  const availableWidgets = computed(() =>
    Object.values(WIDGETS).filter(
      (w) => !layout.value.some((i) => i.id === w.id),
    ),
  );

  const persist = useDebounceFn(async () => {
    saving.value = true;
    try {
      await saveDashboardConfig(layout.value);
    } finally {
      saving.value = false;
    }
  }, 800);

  /** 拉后端布局配置（过滤未知 widget id），无配置回退默认布局 */
  async function loadLayout() {
    try {
      const cfg = await getDashboardConfig();
      const valid = (cfg?.layout ?? []).filter((i) => WIDGETS[i.id]);
      layout.value = valid.length > 0 ? valid : getDefaultLayout();
    } catch {
      layout.value = getDefaultLayout();
    }
    ready.value = true;
  }

  /** 在已渲染的容器上初始化 gridstack 并接管所有 item */
  function initGrid(container: HTMLElement) {
    grid = GridStackClass.init({
      animate: true,
      cellHeight: 40,
      column: 12,
      float: false,
      margin: 6,
      // 初始为预览态（静态），进入编辑模式时 setStatic(false)
      staticGrid: true,
    }, container);

    grid.on('change', (_event: Event, items?: GridStackNode[]) => {
      for (const it of items ?? []) {
        const target = layout.value.find((i) => i.id === String(it.id));
        if (target && it.x !== undefined && it.y !== undefined) {
          target.x = it.x;
          target.y = it.y;
          target.w = it.w ?? target.w;
          target.h = it.h ?? target.h;
        }
      }
      persist();
    });

    watch(editing, (v) => grid?.setStatic(!v));
  }

  /** 添加卡片：放到当前布局底部，Vue 渲染后由 gridstack 接管 */
  async function addWidget(id: string) {
    const def = WIDGETS[id];
    if (!def || !grid) return;
    const bottom = layout.value.reduce((m, i) => Math.max(m, i.y + i.h), 0);
    layout.value.push({ id, ...def.defaultLayout, y: bottom });
    await nextTick();
    const el = container()?.querySelector(`[gs-id="${id}"]`);
    if (el) grid.makeWidget(el as HTMLElement);
    persist();
  }

  /** 移除卡片：gridstack 先卸载控制（不删 DOM），Vue 再按 key 移除 */
  function removeWidget(id: string) {
    const el = container()?.querySelector(`[gs-id="${id}"]`);
    if (el && grid) grid.removeWidget(el as HTMLElement, false);
    layout.value = layout.value.filter((i) => i.id !== id);
    persist();
  }

  /** 恢复默认布局：逐条 update 通知 gridstack 重排（它不监听 DOM 属性变化） */
  async function resetDefault() {
    layout.value = getDefaultLayout();
    await nextTick();
    for (const item of layout.value) {
      const el = container()?.querySelector(`[gs-id="${item.id}"]`);
      if (el && grid) {
        grid.update(el as HTMLElement, {
          h: item.h,
          w: item.w,
          x: item.x,
          y: item.y,
        });
      }
    }
    persist();
  }

  let containerEl: HTMLElement | null = null;
  function container() {
    return containerEl;
  }

  return {
    addWidget,
    availableWidgets,
    editing,
    initGrid: (el: HTMLElement) => {
      containerEl = el;
      initGrid(el);
    },
    layout,
    loadLayout,
    ready,
    removeWidget,
    resetDefault,
    saving,
  };
}
