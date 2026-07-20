<script lang="ts" setup>
import type { RbacApi } from '#/api/rbac';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { Checkbox, message, Spin, Tooltip } from 'ant-design-vue';

import { getPermissionList, setRolePermissions } from '#/api/rbac';

defineOptions({ name: 'PermissionDrawer' });

const emits = defineEmits(['success']);

const loading = ref(false);
const allPermissions = ref<RbacApi.Permission[]>([]);
const checkedCodes = ref<string[]>([]);
const role = ref<null | RbacApi.Role>(null);

const isBuiltIn = computed(() => role.value?.isBuiltIn === 1);

/** antd Checkbox change 事件（结构类型，避免深路径导入） */
type CheckboxChange = { target: { checked: boolean } };

/** 菜单权限 module（复数）→ 操作权限 module（单数），把两类权限归并到同一模块行 */
const MENU_TO_ACTION_MODULE: Record<string, string> = {
  customers: 'customer',
  policies: 'policy',
  rbac: 'rbac',
  renewals: 'renewal',
  users: 'users',
  vehicles: 'vehicle',
};

/** code 后缀 → 简化标签；其余按「去掉模块名前缀」简化，兜底显示原名 */
const ACTION_SUFFIX_LABEL: Record<string, string> = {
  create: '新增',
  delete: '删除',
  update: '编辑',
};

interface ActionItem {
  code: string;
  label: string;
}
interface ModuleRow {
  key: string;
  name: string;
  /** 「查询」= 模块菜单显示权限的 code */
  menuCode?: string;
  actions: ActionItem[];
  /** 行内全部 code（行级全选用） */
  codes: string[];
}

function actionLabel(p: RbacApi.Permission, menuName: string): string {
  const suffix = p.code.split(':')[1] ?? '';
  if (ACTION_SUFFIX_LABEL[suffix]) return ACTION_SUFFIX_LABEL[suffix];
  const prefix = menuName.replace(/管理$/, '');
  if (prefix && p.name.startsWith(prefix) && p.name.length > prefix.length) {
    return p.name.slice(prefix.length);
  }
  return p.name;
}

/** 按模块归并：每个菜单模块一行 = 查询（菜单权限）+ 该模块全部操作权限 */
const moduleRows = computed<ModuleRow[]>(() => {
  const menus = allPermissions.value
    .filter((p) => p.type === 'menu')
    .sort((a, b) => a.sort - b.sort);
  const actions = allPermissions.value.filter((p) => p.type === 'action');
  const usedActionIds = new Set<number>();

  const rows: ModuleRow[] = menus.map((menu) => {
    const items = actions
      .filter((a) => a.module === MENU_TO_ACTION_MODULE[menu.module])
      .sort((a, b) => a.sort - b.sort);
    for (const a of items) usedActionIds.add(a.id);
    return {
      key: menu.code,
      name: menu.name,
      menuCode: menu.code,
      actions: items.map((a) => ({
        code: a.code,
        label: actionLabel(a, menu.name),
      })),
      codes: [menu.code, ...items.map((a) => a.code)],
    };
  });

  // 兜底：未归并到任何菜单模块的操作权限单独成行（当前数据没有，防御未来新增）
  const orphans = actions.filter((a) => !usedActionIds.has(a.id));
  if (orphans.length > 0) {
    rows.push({
      key: '__orphan__',
      name: '其他',
      actions: orphans.map((a) => ({ code: a.code, label: a.name })),
      codes: orphans.map((a) => a.code),
    });
  }
  return rows;
});

const totalCount = computed(() => allPermissions.value.length);
const checkedCount = computed(() => checkedCodes.value.length);
const allChecked = computed(
  () => totalCount.value > 0 && checkedCount.value === totalCount.value,
);
const allIndeterminate = computed(
  () => checkedCount.value > 0 && checkedCount.value < totalCount.value,
);

function rowChecked(row: ModuleRow) {
  return row.codes.every((c) => checkedCodes.value.includes(c));
}
function rowIndeterminate(row: ModuleRow) {
  const n = row.codes.filter((c) => checkedCodes.value.includes(c)).length;
  return n > 0 && n < row.codes.length;
}

function toggleAll(e: CheckboxChange) {
  checkedCodes.value = e.target.checked
    ? allPermissions.value.map((p) => p.code)
    : [];
}
function toggleRow(row: ModuleRow, e: CheckboxChange) {
  const rest = checkedCodes.value.filter((c) => !row.codes.includes(c));
  checkedCodes.value = e.target.checked ? [...rest, ...row.codes] : rest;
}
function toggleOne(code: string, e: CheckboxChange) {
  checkedCodes.value = e.target.checked
    ? [...new Set([...checkedCodes.value, code])]
    : checkedCodes.value.filter((c) => c !== code);
}

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    if (!role.value) return;
    drawerApi.lock();
    try {
      await setRolePermissions(role.value.id, checkedCodes.value);
      message.success('保存成功');
      emits('success');
      drawerApi.close();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = drawerApi.getData<RbacApi.Role>();
    role.value = data;
    checkedCodes.value = [...(data?.permissions ?? [])];
    if (!allPermissions.value.length) {
      loading.value = true;
      try {
        allPermissions.value = await getPermissionList();
      } finally {
        loading.value = false;
      }
    }
  },
});
</script>

<template>
  <Drawer :title="`配置权限 - ${role?.name ?? ''}`" class="w-[720px]">
    <Spin :spinning="loading">
      <div
        v-if="isBuiltIn"
        class="mb-4 rounded border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700"
      >
        内置角色（管理员）拥有全部权限，运行时超级短路放行，无需也不可调整。
      </div>

      <div
        class="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700"
      >
        <!-- 表头：全选 + 已选计数 -->
        <div
          class="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="w-36 shrink-0">
            <Checkbox
              :checked="allChecked"
              :indeterminate="allIndeterminate"
              :disabled="isBuiltIn"
              @change="toggleAll"
            >
              <span class="font-medium">模块</span>
            </Checkbox>
          </div>
          <div class="flex flex-1 items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">
              权限（勾选即启用）
            </span>
            <span class="text-xs text-gray-400">
              已选 {{ checkedCount }} / {{ totalCount }} 项
            </span>
          </div>
        </div>

        <!-- 模块行：查询（菜单显示）+ 该模块操作权限 -->
        <div
          v-for="row in moduleRows"
          :key="row.key"
          class="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
        >
          <div class="w-36 shrink-0">
            <Checkbox
              :checked="rowChecked(row)"
              :indeterminate="rowIndeterminate(row)"
              :disabled="isBuiltIn"
              @change="(e) => toggleRow(row, e)"
            >
              <span class="font-medium">{{ row.name }}</span>
            </Checkbox>
          </div>
          <div class="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
            <Tooltip
              v-if="row.menuCode"
              title="模块显示权限：勾选后左侧菜单显示该模块"
              placement="top"
            >
              <Checkbox
                :checked="checkedCodes.includes(row.menuCode)"
                :disabled="isBuiltIn"
                @change="(e) => toggleOne(row.menuCode!, e)"
              >
                查询
              </Checkbox>
            </Tooltip>
            <Checkbox
              v-for="a in row.actions"
              :key="a.code"
              :checked="checkedCodes.includes(a.code)"
              :disabled="isBuiltIn"
              @change="(e) => toggleOne(a.code, e)"
            >
              {{ a.label }}
            </Checkbox>
          </div>
        </div>
      </div>

      <div class="mt-3 text-xs leading-5 text-gray-400">
        「查询」为模块菜单显示权限，其余为模块内敏感操作权限。保存后接口侧立即生效；相关用户的菜单/按钮在其重新登录后更新。
      </div>
    </Spin>
  </Drawer>
</template>
