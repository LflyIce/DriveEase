<script lang="ts" setup>
import type { UserApi } from '#/api/user';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createUser, updateUser } from '#/api/user';

import { useFormSchema } from '../data';

defineOptions({ name: 'UserForm' });

const emits = defineEmits(['success']);

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const editingId = ref<number>();

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    // 密码留空时不提交该字段（编辑保持原密码）
    if (!values.password) delete values.password;
    modalApi.lock();
    (editingId.value
      ? updateUser(editingId.value, values)
      : createUser(values)
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
    const data = modalApi.getData<UserApi.User>();
    formApi.resetForm();
    editingId.value = data?.id;
    if (data?.id) {
      await nextTick();
      formApi.setValues(data);
    }
  },
});

const title = computed(() => (editingId.value ? '编辑用户' : '新建用户'));
</script>

<template>
  <Modal :title="title">
    <Form />
  </Modal>
</template>
