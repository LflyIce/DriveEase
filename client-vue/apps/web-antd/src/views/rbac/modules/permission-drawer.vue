<script lang="ts" setup>
import type { RbacApi } from '#/api/rbac';

import { computed, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { Checkbox, CheckboxGroup, message, Spin } from 'ant-design-vue';

import { getPermissionList, setRolePermissions } from '#/api/rbac';

defineOptions({ name: 'PermissionDrawer' });

const emits = defineEmits(['success']);

const loading = ref(false);
const allPermissions = ref<RbacApi.Permission[]>([]);
const checkedCodes = ref<string[]>([]);
const role = ref<null | RbacApi.Role>(null);

const isBuiltIn = computed(() => role.value?.isBuiltIn === 1);

function groupByModule(perms: RbacApi.Permission[]) {
  const map = new Map<string, RbacApi.Permission[]>();
  for (const p of perms) {
    const m = p.module || '其他';
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(p);
  }
  return [...map.entries()].map(([module, items]) => ({ items, module }));
}

const menuPerms = computed(() =>
  allPermissions.value.filter((p) => p.type === 'menu'),
);
const actionGroups = computed(() =>
  groupByModule(allPermissions.value.filter((p) => p.type === 'action')),
);

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
  <Drawer :title="`配置权限 - ${role?.name ?? ''}`" class="w-[640px]">
    <Spin :spinning="loading">
      <div
        v-if="isBuiltIn"
        class="mb-4 rounded border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700"
      >
        内置角色（管理员）拥有全部权限，运行时超级短路放行，无需也不可调整。
      </div>
      <CheckboxGroup
        v-model:value="checkedCodes"
        :disabled="isBuiltIn"
        class="w-full"
      >
        <div class="mb-2 font-semibold">菜单权限</div>
        <div class="mb-6 grid grid-cols-2 gap-2">
          <Checkbox v-for="p in menuPerms" :key="p.code" :value="p.code">
            {{ p.name }}
          </Checkbox>
        </div>
        <div class="mb-2 font-semibold">操作权限</div>
        <div v-for="g in actionGroups" :key="g.module" class="mb-3">
          <div class="mb-1 text-xs text-gray-500">{{ g.module }}</div>
          <div class="grid grid-cols-2 gap-2">
            <Checkbox v-for="p in g.items" :key="p.code" :value="p.code">
              {{ p.name }}
            </Checkbox>
          </div>
        </div>
      </CheckboxGroup>
    </Spin>
  </Drawer>
</template>
