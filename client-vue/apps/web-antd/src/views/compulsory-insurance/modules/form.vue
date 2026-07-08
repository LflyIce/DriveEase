<script lang="ts" setup>
import type { CompulsoryInsuranceApi } from '#/api/compulsory-insurance';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createCompulsoryInsurance,
  updateCompulsoryInsurance,
} from '#/api/compulsory-insurance';

import { useFormSchema } from '../data';

defineOptions({ name: 'CompulsoryInsuranceForm' });

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
      ? updateCompulsoryInsurance(editingId.value, values)
      : createCompulsoryInsurance(values)
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
    const data = modalApi.getData<CompulsoryInsuranceApi.Type>();
    formApi.resetForm();
    editingId.value = data?.id;
    if (data?.id) {
      await nextTick();
      formApi.setValues(data);
    }
  },
});

const title = computed(() => (editingId.value ? '编辑险种' : '新建险种'));
</script>

<template>
  <Modal :title="title">
    <Form />
  </Modal>
</template>
