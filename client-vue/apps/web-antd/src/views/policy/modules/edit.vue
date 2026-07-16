<script lang="ts" setup>
import { nextTick, ref } from 'vue';

import { Button, Card, Drawer, message, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { getPolicy, updatePolicy } from '#/api/policy';

import {
  useChargeSchema,
  useEditBaseSchema,
  usePremiumSchema,
  useRemarkSchema,
} from '../data';

defineOptions({ name: 'PolicyEdit' });

const emit = defineEmits<{ (e: 'success'): void }>();

const open = ref(false);
const loading = ref(false);
const saving = ref(false);
const editId = ref<null | number>(null);

// 4 个分组表单（复用录入页同款 schema）：基础 / 保费 / 手续费 / 备注
// 保费、手续费 schema 内置联动（合计保费、手续费总计），编辑时同样生效。
const [BaseForm, baseApi] = useVbenForm({
  schema: useEditBaseSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});
const [PremiumForm, premiumApi] = useVbenForm({
  schema: usePremiumSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});
const [ChargeForm, chargeApi] = useVbenForm({
  schema: useChargeSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});
const [RemarkForm, remarkApi] = useVbenForm({
  schema: useRemarkSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});

const merged = baseApi.merge(premiumApi).merge(chargeApi).merge(remarkApi);

// DatePicker 受控值需 dayjs 对象（回填时 string → dayjs；提交时 dayjs → 'YYYY-MM-DD'）
const DATE_FIELDS = ['policyDate', 'expiryDate'] as const;

async function show(id: number) {
  editId.value = id;
  open.value = true;
  loading.value = true;
  try {
    const d = await getPolicy(id);
    const values: Record<string, any> = { ...d };
    for (const f of DATE_FIELDS) {
      const v = values[f];
      values[f] = v ? dayjs(v) : undefined;
    }
    // 抽屉打开后等表单挂载，再分给各分组 setValues（各表单只认自己 schema 的字段，多余键忽略）
    await nextTick();
    baseApi.setValues(values);
    premiumApi.setValues(values);
    chargeApi.setValues(values);
    remarkApi.setValues(values);
  } finally {
    loading.value = false;
  }
}

defineExpose({ show });

async function onSubmit() {
  if (editId.value == null) return;
  saving.value = true;
  try {
    const values = await merged.submitAllForm(true);
    if (!values) {
      message.warning('请填写所有必填项');
      return;
    }
    for (const f of DATE_FIELDS) {
      const v = (values as Record<string, any>)[f];
      if (v && dayjs.isDayjs(v))
        (values as Record<string, any>)[f] = v.format('YYYY-MM-DD');
    }
    await updatePolicy(editId.value, values as Record<string, any>);
    message.success('保存成功');
    open.value = false;
    emit('success');
  } catch {
    // 错误提示由请求层统一处理
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer v-model:open="open" title="编辑保单" :width="760">
    <Spin :spinning="loading">
      <div class="flex flex-col gap-4">
        <Card title="基础信息">
          <BaseForm />
        </Card>
        <Card title="保费信息">
          <PremiumForm />
        </Card>
        <Card title="手续费与支出">
          <ChargeForm />
        </Card>
        <Card title="备注">
          <RemarkForm />
        </Card>
      </div>
    </Spin>

    <template #footer>
      <div class="flex justify-end gap-3">
        <Button @click="open = false">取消</Button>
        <Button :loading="saving" type="primary" @click="onSubmit">
          保存
        </Button>
      </div>
    </template>
  </Drawer>
</template>
