<script lang="ts" setup>
import type { CustomerApi } from '#/api/customer';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createCustomer, updateCustomer } from '#/api/customer';

import { useFormSchema } from '../data';

defineOptions({ name: 'CustomerForm' });

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
    modalApi.lock();
    (editingId.value
      ? updateCustomer(editingId.value, values)
      : createCustomer(values)
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
    const data = modalApi.getData<CustomerApi.Customer>();
    formApi.resetForm();
    editingId.value = data?.id;
    if (data?.id) {
      // 编辑：回填（data 来自列表行，已是完整对象）
      await nextTick();
      formApi.setValues(data);
    }
  },
});

const title = computed(() => (editingId.value ? '编辑客户' : '新建客户'));
</script>

<template>
  <Modal :title="title">
    <Form />
  </Modal>
</template>
