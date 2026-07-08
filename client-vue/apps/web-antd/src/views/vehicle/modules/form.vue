<script lang="ts" setup>
import type { VehicleApi } from '#/api/vehicle';

import { computed, nextTick, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { createVehicle, updateVehicle } from '#/api/vehicle';

import { useFormSchema } from '../data';

defineOptions({ name: 'VehicleForm' });

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
      ? updateVehicle(editingId.value, values)
      : createVehicle(values)
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
    const data = modalApi.getData<VehicleApi.Vehicle>();
    formApi.resetForm();
    editingId.value = data?.id;
    if (data?.id) {
      await nextTick();
      formApi.setValues(data);
    }
  },
});

const title = computed(() => (editingId.value ? '编辑车辆' : '新建车辆'));
</script>

<template>
  <Modal :title="title">
    <Form />
  </Modal>
</template>
