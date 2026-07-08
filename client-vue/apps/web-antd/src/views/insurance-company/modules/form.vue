<script lang="ts" setup>
import type { InsuranceCompanyApi } from '#/api/insurance-company';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import {
  createInsuranceCompany,
  updateInsuranceCompany,
} from '#/api/insurance-company';

import { useFormSchema } from '../data';

defineOptions({ name: 'InsuranceCompanyForm' });

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
      ? updateInsuranceCompany(editingId.value, values)
      : createInsuranceCompany(values)
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
    const data = modalApi.getData<InsuranceCompanyApi.Company>();
    formApi.resetForm();
    editingId.value = data?.id;
    if (data?.id) {
      await nextTick();
      formApi.setValues(data);
    }
  },
});

const title = computed(() =>
  editingId.value ? '编辑保险公司' : '新建保险公司',
);
</script>

<template>
  <Modal :title="title">
    <Form />
  </Modal>
</template>
