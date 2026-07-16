<script lang="ts" setup>
import type { RbacApi } from '#/api/rbac';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createRole, updateRole } from '#/api/rbac';

import { useRoleFormSchema } from '../data';

defineOptions({ name: 'RoleForm' });

const emits = defineEmits(['success']);

const [Form, formApi] = useVbenForm({
  schema: useRoleFormSchema(),
  showDefaultActions: false,
});

const editingId = ref<number>();

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    modalApi.lock();
    (editingId.value
      ? updateRole(editingId.value, {
          description: values.description,
          name: values.name,
        })
      : createRole({
          code: values.code,
          description: values.description,
          name: values.name,
        })
    )
      .then(() => {
        emits('success');
        modalApi.close();
      })
      .catch(() => {
        modalApi.unlock();
      });
  },
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    const data = modalApi.getData<RbacApi.Role>();
    formApi.resetForm();
    editingId.value = data?.id;
    if (data?.id) {
      await nextTick();
      formApi.setValues(data);
    }
  },
});

const title = computed(() => (editingId.value ? '编辑角色' : '新建角色'));
</script>

<template>
  <Modal :title="title">
    <Form />
  </Modal>
</template>
