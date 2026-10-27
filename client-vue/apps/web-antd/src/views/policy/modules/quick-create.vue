<script lang="ts" setup>
import { nextTick, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useUserStore } from '@vben/stores';

import { Button, Drawer, Image, message, Upload } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { createPolicyFull } from '#/api/policy';
import { requestClient } from '#/api/request';

import { useQuickCreateSchema } from '../data';

defineOptions({ name: 'PolicyQuickCreate' });

const emit = defineEmits<{ (e: 'success'): void }>();

const userStore = useUserStore();

const open = ref(false);
const saving = ref(false);

// 合计保费：非表单字段，由三项保费联动求和，展示条呈现（默认 0）
const totalPremium = ref(0);

const [Form, formApi] = useVbenForm({
  schema: useQuickCreateSchema((sum) => {
    totalPremium.value = sum;
  }),
  showDefaultActions: false,
});

// —— 材料上传（Dragger：点击选择 + 拖拽双入口；微信 PC 版聊天窗口拖出的文件即标准 File 对象，可直接接收）——
const UploadDragger = Upload.Dragger;
const fileList = ref<any[]>([]);

// 图片预览：接管 onPreview，页内受控 Image 放大（X/Esc/蒙层均可关闭）
const previewVisible = ref(false);
const previewSrc = ref('');
const onPreviewVisibleChange = (v: boolean) => {
  previewVisible.value = v;
  // 关闭即清空，不留任何内联渲染状态
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
  // picture：紧凑行（48px 小缩略图 + 文件名）——text 模式下 antd 对带 thumbUrl 的图片
  // 会整幅渲染原图，材料是照片时会撑满抽屉
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
          // axios 上传进度 → antd 列表项实时进度条
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
    } catch (e) {
      opt.onError?.(e as Error);
      message.error('材料上传失败，请重试');
    }
  },
};

/** 已上传成功的材料 URL（排除上传中/失败的） */
function uploadedUrls(): string[] {
  return fileList.value
    .filter((f) => f.status === 'done')
    .map((f) => f.url || f.response?.url)
    .filter(Boolean);
}

function show() {
  open.value = true;
  // 默认值：投保日期=今天；业务员=当前登录人（保期默认值在 schema defaultValue）
  nextTick(() => {
    formApi.setValues({
      policyDate: dayjs(),
      salesPerson: userStore.userInfo?.username,
    });
  });
}

defineExpose({ show });

function reset() {
  formApi.resetForm();
  fileList.value = [];
  totalPremium.value = 0;
}

async function onSubmit() {
  // validate() 只看 valid（其返回的 values 在 vben 适配层不可靠，可能为空对象）
  const { valid } = await formApi.validate();
  if (!valid) {
    message.warning('请填写所有必填项');
    return;
  }
  const val = (await formApi.getValues()) as Record<string, any>;
  if (!/^1\d{10}$/.test(val.phone ?? '')) {
    message.warning('手机号码格式不正确（11 位）');
    return;
  }
  if (fileList.value.some((f) => f.status === 'uploading')) {
    message.warning('材料还在上传中，请稍候');
    return;
  }
  const urls = uploadedUrls();
  if (urls.length === 0) {
    message.warning('请至少上传一份材料');
    return;
  }

  // 保期（年）→ 到期日期：后端无「保期」列，换算进既有日期字段（2/29 自动落 2/28）
  const policyDate = dayjs.isDayjs(val.policyDate)
    ? val.policyDate
    : dayjs(val.policyDate);
  const years = Number(val.insurancePeriod) || 1;

  saving.value = true;
  try {
    const res = await createPolicyFull({
      name: val.name,
      customerType: val.customerType,
      phone: val.phone,
      salesPerson: val.salesPerson,
      plateNumber: val.plateNumber,
      insuranceCompany: val.insuranceCompany,
      policyDate: policyDate.format('YYYY-MM-DD'),
      expiryDate: policyDate.add(years, 'year').format('YYYY-MM-DD'),
      // 保费拆分（均可空）：非车保费沿用录入页映射存 surchargePremium 列；合计为展示条联动值
      trafficPremium: val.trafficPremium ?? null,
      commercialPremium: val.commercialPremium ?? null,
      surchargePremium: val.surchargePremium ?? null,
      premium: totalPremium.value,
      remark: val.remark || undefined,
      // 材料不分类，多文件 URL 逗号拼接存「其他承保材料」列（详情页拆开逐张展示）
      quotation: urls.join(','),
    });
    message.success(`开单成功：${res?.policyNumber ?? ''}`);
    open.value = false;
    reset();
    emit('success');
  } catch {
    // 业务错误（如「该车牌已录入」）由全局错误拦截器统一 message.error
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer v-model:open="open" placement="left" title="极简开单" :width="520">
    <!-- 业务规则提示：一车一保单 / 客户按手机号复用 -->
    <div
      class="mb-3 rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-400 dark:bg-gray-800/60"
    >
      车牌需未录入过（续保请走续保流程）；同手机号客户自动复用，不覆盖已有资料。
    </div>

    <Form />

    <!-- 合计保费：自动计算展示条（= 交强 + 商业 + 非车，非表单字段） -->
    <div
      class="mb-2 mt-1 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
    >
      <span class="text-sm text-gray-500">
        合计保费
        <span class="ml-1 text-xs text-gray-400">= 交强 + 商业 + 非车</span>
      </span>
      <span class="text-lg font-semibold tabular-nums">
        ¥{{ totalPremium.toFixed(2) }}
      </span>
    </div>

    <!-- 材料：独立 Dragger 区（点击 + 微信拖拽），不在 useVbenForm 内 -->
    <div class="mt-2">
      <div class="mb-2 text-sm">
        <span class="text-red-500">*</span> 材料
        <span class="ml-2 text-xs font-normal text-gray-400">
          点击上传，或将微信聊天中的图片/文件直接拖入
        </span>
      </div>
      <!-- 自带 flex 布局显式居中：不依赖 antd Dragger 内部 display:table 样式（会因 CSS
           加载时序把图标缩在左上角），图标固定 48px 不随字号缩放 -->
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
        <Button :loading="saving" type="primary" @click="onSubmit">
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
