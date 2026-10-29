<script lang="ts" setup>
import { nextTick, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Button, Drawer, Image, message, Upload } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { createNonVehiclePolicy } from '#/api/non-vehicle-policy';
import { requestClient } from '#/api/request';
import { enterToNextRequired } from '#/views/shared/enter-to-next';
import { runFirstTour } from '#/views/shared/first-tour';

import { useQuickCreateSchema } from '../data';

defineOptions({ name: 'NonVehicleQuickCreate' });

const emit = defineEmits<{ (e: 'success'): void }>();

const userStore = useUserStore();

const open = ref(false);
const saving = ref(false);

// 结余 = 费用 - 支出：非表单字段，联动计算，展示条呈现（默认 0，可为负）
const balance = ref(0);

const [Form, formApi] = useVbenForm({
  schema: useQuickCreateSchema((b) => {
    balance.value = b;
  }),
  showDefaultActions: false,
});

// —— 附件上传（Dragger：点击选择 + 拖拽双入口；与车保开单同一套）——
const UploadDragger = Upload.Dragger;
const fileList = ref<any[]>([]);

// 图片预览：接管 onPreview，页内受控 Image 放大
const previewVisible = ref(false);
const previewSrc = ref('');
const onPreviewVisibleChange = (v: boolean) => {
  previewVisible.value = v;
  if (!v) previewSrc.value = '';
};
function onUploadPreview(file: any, e?: Event) {
  e?.preventDefault?.();
  const url = file.url || file.response?.url || file.thumbUrl;
  if (url) {
    previewSrc.value = url;
    previewVisible.value = true;
  }
}

const draggerProps = {
  multiple: true,
  listType: 'picture' as const,
  showUploadList: { showPreviewIcon: true, showRemoveIcon: true },
  onChange: (info: any) => {
    fileList.value = info.fileList;
  },
  onPreview: onUploadPreview,
  customRequest: async (opt: any) => {
    try {
      const res = await requestClient.upload<{ url: string }>(
        '/upload',
        { file: opt.file as File },
        {
          onUploadProgress: (e: any) => {
            if (e.total) {
              opt.onProgress?.(
                { percent: Math.round((e.loaded / e.total) * 100) },
                opt.file,
              );
            }
          },
        },
      );
      opt.onSuccess?.(res);
    } catch {
      opt.onError?.(new Error('upload failed'));
      message.error('附件上传失败，请重试');
    }
  },
};

/** 已上传成功的附件 URL（排除上传中/失败的） */
function uploadedUrls(): string[] {
  return fileList.value
    .filter((f) => f.status === 'done')
    .map((f) => f.url || f.response?.url)
    .filter(Boolean);
}

function show() {
  open.value = true;
  // 默认值：起保时间=今天；业务员=当前登录人
  nextTick(() => {
    formApi.setValues({
      startDate: dayjs(),
      salesPerson: userStore.userInfo?.username,
    });
    // 首次开单导览（driver.js 高亮分步）：看完/退出记 localStorage 后不再演（改步骤换 key 版本号）
    runFirstTour('driveease_tip_nonvehicle_quickcreate_v1', [
      {
        element: '.de-tour-intro',
        popover: { title: '开单小提示', description: '首次开单看这里，跟着高亮走一遍即可。' },
      },
      {
        element: '.de-tour-form',
        popover: { title: '必填信息', description: '带 * 为必填项；表单内按回车可跳到下一个必填项。' },
      },
      {
        element: '.de-tour-total',
        popover: { title: '结余', description: '= 费用 − 支出，自动计算无需填写。' },
      },
      {
        element: '.de-tour-upload',
        popover: { title: '附件上传', description: '附件必传；支持将微信聊天中的图片/文件直接拖入。' },
      },
      {
        element: '.de-tour-submit',
        popover: { title: '提交', description: '填完后点「提交开单」完成录入。' },
      },
    ]);
  });
}

defineExpose({ show });

/** 回车跳下一必填项（备注 textarea 保留换行不跳；之后无必填项则不动） */
function onFormEnter(e: KeyboardEvent) {
  if (e.key !== 'Enter') return;
  const target = e.target as HTMLElement;
  if (target.tagName === 'TEXTAREA') return;
  const next = enterToNextRequired(e.currentTarget as HTMLElement, target);
  if (next) {
    e.preventDefault();
    next.focus();
  }
}

function reset() {
  formApi.resetForm();
  fileList.value = [];
  balance.value = 0;
}

function fmt(v: any): string {
  return (dayjs.isDayjs(v) ? v : dayjs(v)).format('YYYY-MM-DD');
}

async function onSubmit() {
  // validate() 只看 valid（其返回的 values 在 vben 适配层不可靠）
  const { valid } = await formApi.validate();
  if (!valid) {
    message.warning('请填写所有必填项');
    return;
  }
  const val = (await formApi.getValues()) as Record<string, any>;
  if (!/^1\d{10}$/.test(val.contactPhone ?? '')) {
    message.warning('联系电话格式不正确（11 位）');
    return;
  }
  if (fileList.value.some((f) => f.status === 'uploading')) {
    message.warning('附件还在上传中，请稍候');
    return;
  }
  const urls = uploadedUrls();
  if (urls.length === 0) {
    message.warning('请至少上传一份附件');
    return;
  }

  saving.value = true;
  try {
    // 结余后端按 费用-支出 重算为准，前端不重复提交
    const res = await createNonVehiclePolicy({
      enterpriseName: val.enterpriseName,
      insuranceType: val.insuranceType,
      projectName: val.projectName || undefined,
      personInCharge: val.personInCharge,
      contactPhone: val.contactPhone,
      sumInsured: val.sumInsured ?? null,
      premium: val.premium ?? null,
      fee: val.fee ?? null,
      expenses: val.expenses ?? null,
      insuranceCompany: val.insuranceCompany,
      salesPerson: val.salesPerson,
      startDate: fmt(val.startDate),
      endDate: fmt(val.endDate),
      remark: val.remark || undefined,
      // 附件不分类，多文件 URL 逗号拼接（详情页拆开逐张展示）
      attachment: urls.join(','),
    });
    message.success(`开单成功：${res?.enterpriseName ?? ''}`);
    open.value = false;
    reset();
    emit('success');
  } catch {
    // 业务错误由全局错误拦截器统一 message.error
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer v-model:open="open" placement="left" title="极速开单" :width="520">
    <!-- 业务规则提示（de-tour-intro：首次导览锚点） -->
    <div
      class="de-tour-intro mb-3 rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-400 dark:bg-gray-800/60"
    >
      非车保单按企业录入；结余 = 费用 − 支出，自动计算无需填写。
    </div>

    <div class="de-tour-form" @keydown.capture="onFormEnter">
      <Form />
    </div>

    <!-- 结余：自动计算展示条（= 费用 − 支出，可为负；de-tour-total 导览锚点） -->
    <div
      class="de-tour-total mb-2 mt-1 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
    >
      <span class="text-sm text-gray-500">
        结余
        <span class="ml-1 text-xs text-gray-400">= 费用 − 支出</span>
      </span>
      <span class="text-lg font-semibold tabular-nums">
        ¥{{ balance.toFixed(2) }}
      </span>
    </div>

    <!-- 附件：独立 Dragger 区（点击 + 微信拖拽），不在 useVbenForm 内（de-tour-upload 导览锚点） -->
    <div class="de-tour-upload mt-2">
      <div class="mb-2 text-sm">
        <span class="text-red-500">*</span> 附件
        <span class="ml-2 text-xs font-normal text-gray-400">
          点击上传，或将微信聊天中的图片/文件直接拖入
        </span>
      </div>
      <!-- 显式 flex 居中（antd Dragger 内部样式加载时序问题，同车保开单） -->
      <UploadDragger v-bind="draggerProps" :file-list="fileList">
        <div class="flex flex-col items-center justify-center gap-1 py-5">
          <IconifyIcon
            class="text-primary size-12"
            icon="ant-design:cloud-upload-outlined"
          />
          <p class="mt-2 text-sm font-medium">点击或拖拽文件到此区域上传</p>
          <p class="text-xs text-gray-400">
            支持多文件；微信 PC 版聊天窗口里的图片、文件可直接拖入
          </p>
        </div>
      </UploadDragger>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button @click="open = false">取 消</Button>
        <Button class="de-tour-submit" :loading="saving" type="primary" @click="onSubmit">
          提交开单
        </Button>
      </div>
    </template>

    <!-- 图片预览层：受控 Image，由 onUploadPreview 触发 -->
    <Image
      v-show="false"
      :src="previewSrc"
      :preview="{
        visible: previewVisible,
        onVisibleChange: onPreviewVisibleChange,
      }"
    />
  </Drawer>
</template>
