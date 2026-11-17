<script lang="ts" setup>
import { nextTick, reactive, ref } from 'vue';

import { Button, Card, Drawer, Image, message, Spin } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { getPolicy, updatePolicy } from '#/api/policy';
import { requestClient } from '#/api/request';

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
const DATE_FIELDS = ['policyDate', 'expiryDate', 'commercialDate'] as const;

// —— 材料编辑（COS URL）——
// 键 = 后端 UpdatePolicyDto 的材料字段（camelCase）。
// 客户/车辆材料为档案级：保存时后端同步更新 customer/vehicle 档案（未传不改，传 null 移除）。
const MATERIAL_KEYS = [
  'ssnFront',
  'ssnBack',
  'businessLicense',
  'drivingFront',
  'drivingBack',
  'quotation',
  'policyFile',
] as const;

// 材料位配置（分组 + 布局列数），模板统一渲染
interface MaterialItem {
  key: string;
  label: string;
  multi?: boolean;
  doc?: boolean;
}
const MATERIAL_GROUPS: { title: string; cols: string; items: MaterialItem[] }[] =
  [
    {
      title: '客户材料',
      cols: 'sm:grid-cols-3',
      items: [
        { key: 'ssnFront', label: '身份证正面' },
        { key: 'ssnBack', label: '身份证反面' },
        { key: 'businessLicense', label: '营业执照' },
      ],
    },
    {
      title: '车辆材料',
      cols: 'sm:grid-cols-2',
      items: [
        { key: 'drivingFront', label: '行驶证正页' },
        { key: 'drivingBack', label: '行驶证副页' },
      ],
    },
    {
      title: '保单材料',
      cols: '',
      items: [
        { key: 'quotation', label: '其他承保材料（可多张）', multi: true },
        { key: 'policyFile', label: '电子保单（doc/pdf）', doc: true },
      ],
    },
  ];

const files = reactive<Record<string, string>>({
  ssnFront: '',
  ssnBack: '',
  businessLicense: '',
  drivingFront: '',
  drivingBack: '',
  quotation: '',
  policyFile: '',
});

// 已上传文件列表（自定义展示，不用 antd Upload 的内置列表，避免撑高/遮挡下方材料位）
const fileLists = reactive<Record<string, any[]>>({
  ssnFront: [],
  ssnBack: [],
  businessLicense: [],
  drivingFront: [],
  drivingBack: [],
  quotation: [],
  policyFile: [],
});

// 图片预览：页内受控 Image 弹大图（支持缩放/旋转）
const previewVisible = ref(false);
const previewSrc = ref('');
const onPreviewVisibleChange = (v: boolean) => {
  previewVisible.value = v;
  if (!v) previewSrc.value = '';
};
const onUploadPreview = (file: any) => {
  const url = file.url || file.response?.url || file.thumbUrl;
  if (url) {
    previewSrc.value = url;
    previewVisible.value = true;
  }
};

const ACCEPT: Record<string, string> = {
  policyFile: '.doc,.docx,.pdf',
};

function acceptOf(key: string) {
  return ACCEPT[key] || 'image/*';
}

// 单图字段限 1 张（quotation 多图不限）
function canAdd(key: string) {
  if (key === 'quotation') return true;
  if ((fileLists[key]?.length ?? 0) >= 1) {
    message.warning('只能上传一张，请先删除已有文件');
    return false;
  }
  return true;
}

// 自定义上传：隐藏 input 点击选择 + 原生 drop 拖拽（不依赖 antd Upload 组件）
function triggerPick(key: string) {
  if (!canAdd(key)) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = acceptOf(key);
  input.multiple = key === 'quotation';
  input.onchange = (e: Event) => {
    const list = Array.from((e.target as HTMLInputElement).files ?? []);
    for (const f of list) void uploadOne(key, f);
  };
  input.click();
}

function onDrop(key: string, e: DragEvent) {
  e.preventDefault();
  if (!canAdd(key)) return;
  const list = Array.from(e.dataTransfer?.files ?? []);
  for (const f of list) void uploadOne(key, f);
}

async function uploadOne(key: string, file: File) {
  const uid = `${key}-${Date.now()}-${file.name}`;
  // 先放占位项，显示「上传中」
  fileLists[key] = [
    ...(fileLists[key] ?? []),
    { uid, name: file.name, status: 'uploading' },
  ];
  try {
    const res = await requestClient.upload<{ url: string }>('/upload', {
      file,
    });
    const url = res.url;
    fileLists[key] = (fileLists[key] ?? []).map((f: any) =>
      f.uid === uid ? { ...f, status: 'done', url } : f,
    );
    if (key === 'quotation') {
      files.quotation = (fileLists.quotation ?? [])
        .map((f: any) => f.url)
        .filter(Boolean)
        .join(',');
    } else {
      files[key] = url;
    }
  } catch {
    // 失败项移除
    fileLists[key] = (fileLists[key] ?? []).filter(
      (f: any) => f.uid !== uid,
    );
    message.error(`${file.name} 上传失败`);
  }
}

// 删除单个已上传文件（quotation 多图重算逗号拼接；其余清空）
function removeFile(key: string, uid: string | number) {
  const list = (fileLists[key] ?? []).filter((f: any) => f.uid !== uid);
  fileLists[key] = list;
  if (key === 'quotation') {
    files.quotation = list
      .map((f: any) => f.url || f.response?.url)
      .filter(Boolean)
      .join(',');
  } else {
    files[key] = '';
  }
}

// 编辑回显：把保单/客户/车辆档案里的材料 URL 填回上传控件
function fillMaterials(d: any) {
  // 先清空，避免切换保单时串数据
  for (const k of MATERIAL_KEYS) {
    files[k] = '';
    fileLists[k] = [];
  }
  const c = d.customer ?? {};
  const v = d.vehicle ?? {};
  const set = (key: string, url?: null | string) => {
    const u = url || '';
    files[key] = u;
    fileLists[key] = u
      ? [{ uid: key, name: key, status: 'done', url: u }]
      : [];
  };
  set('ssnFront', c.ssnFront);
  set('ssnBack', c.ssnBack);
  set('businessLicense', c.businessLicense);
  set('drivingFront', v.drivingFront);
  set('drivingBack', v.drivingBack);
  set('policyFile', d.policyFile);
  // 其他承保材料：历史数据可能逗号拼接多 URL，逐张展示
  const urls = (d.quotation || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
  files.quotation = d.quotation || '';
  fileLists.quotation = urls.map((u: string, i: number) => ({
    uid: `quotation-${i}`,
    name: `材料${i + 1}`,
    status: 'done',
    url: u,
  }));
}

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
    fillMaterials(d);
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
    // 材料全量提交（编辑区始终展示当前值，未动=原值幂等；空串视为移除，后端写 null）
    const materialPayload = Object.fromEntries(
      MATERIAL_KEYS.map((k) => [k, files[k] ? files[k] : null]),
    );
    await updatePolicy(editId.value, {
      ...(values as Record<string, any>),
      ...materialPayload,
    });
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
        <Card title="材料信息">
          <div class="flex flex-col gap-4">
            <div v-for="group in MATERIAL_GROUPS" :key="group.title">
              <div class="mb-2 text-sm text-gray-500">{{ group.title }}</div>
              <div class="grid grid-cols-1 gap-3" :class="group.cols">
                <div v-for="item in group.items" :key="item.key">
                  <!-- 固定高度的上传区：点击选择 + 原生拖拽，内部无列表 DOM -->
                  <div
                    class="material-drop"
                    @click="triggerPick(item.key)"
                    @dragover.prevent
                    @drop="onDrop(item.key, $event)"
                  >
                    <div
                      class="flex flex-col items-center justify-center gap-1"
                    >
                      <IconifyIcon
                        class="text-primary size-8"
                        icon="ant-design:cloud-upload-outlined"
                      />
                      <p class="text-xs text-gray-500">{{ item.label }}</p>
                      <p class="text-xs text-gray-400">点击或拖拽</p>
                    </div>
                  </div>
                  <!-- 已上传文件条：独立一行行展示，绝不覆盖下方材料位 -->
                  <div
                    v-for="f in fileLists[item.key]"
                    :key="f.uid"
                    class="mt-2 flex items-center gap-2 rounded border border-gray-200 p-2"
                  >
                    <img
                      v-if="f.status === 'done' && (f.url || f.response?.url)"
                      :src="f.url || f.response?.url"
                      class="size-8 shrink-0 object-cover"
                    />
                    <span
                      v-else
                      class="flex size-8 shrink-0 items-center justify-center bg-gray-100 text-xs text-gray-400"
                    >
                      {{ f.status === 'uploading' ? '上传中' : 'file' }}
                    </span>
                    <span class="flex-1 truncate text-xs">{{ f.name }}</span>
                    <Button
                      v-if="f.status === 'done'"
                      size="small"
                      type="link"
                      @click="onUploadPreview(f)"
                    >
                      预览
                    </Button>
                    <Button
                      size="small"
                      danger
                      type="link"
                      @click="removeFile(item.key, f.uid)"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

<style scoped>
/* 上传区固定高度：上传前后高度一致，不会撑高/遮挡下方材料位 */
.material-drop {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.material-drop:hover {
  border-color: #1677ff;
}
</style>
