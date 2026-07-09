<script lang="ts" setup>
import { reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Card, message, Upload } from 'ant-design-vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { useVbenForm } from '#/adapter/form';
import { createPolicyFull } from '#/api/policy';
import { requestClient } from '#/api/request';

import {
  useChargeSchema,
  useCustomerSchema,
  usePremiumSchema,
  useRemarkSchema,
  useVehicleSchema,
} from './data';

defineOptions({ name: 'PolicyCreate' });

const router = useRouter();
const saving = ref(false);

const [CustomerForm, customerApi] = useVbenForm({
  schema: useCustomerSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2',
});
const [VehicleForm, vehicleApi] = useVbenForm({
  schema: useVehicleSchema(),
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

const merged = customerApi
  .merge(vehicleApi)
  .merge(premiumApi)
  .merge(chargeApi)
  .merge(remarkApi);

const DATE_FIELDS = [
  'birthday',
  'register_date',
  'certificate_date',
  'next_inspection_date',
  'policy_date',
  'expiry_date',
];

// —— 材料上传（COS）+ OCR 自动填表 ——
const files = reactive<Record<string, string>>({
  driving_front: '',
  driving_back: '',
  ssn_front: '',
  ssn_back: '',
  business_license: '',
  quotation: '',
  policy_file: '',
});

// Upload 受控 fileList：达到 1 个后隐藏上传按钮（每个字段只能传一张）
const fileLists = reactive<Record<string, any[]>>({
  driving_front: [],
  driving_back: [],
  ssn_front: [],
  ssn_back: [],
  business_license: [],
  quotation: [],
  policy_file: [],
});

function makeCustomRequest(key: string) {
  return async (opt: any) => {
    try {
      const res = await requestClient.upload<{ url: string }>('/upload', {
        file: opt.file as File,
      });
      files[key] = res.url;
      opt.onSuccess?.(res);
    } catch (e) {
      opt.onError?.(e as Error);
    }
  };
}

// 行驶证正页：OCR front → 填车辆 + 客户
async function uploadDrivingFront(opt: any) {
  try {
    const res = await requestClient.upload<{ url: string }>('/upload', {
      file: opt.file as File,
    });
    files.driving_front = res.url;
    opt.onSuccess?.(res);
    const info = await requestClient.get<any>('/ocr/vehicle-license', {
      params: { imageUrl: res.url, side: 'front' },
    });
    vehicleApi.setValues({
      plate_number: info.plate_number,
      vin: info.vin,
      engine_number: info.engine_number,
      brand_model: info.brand_model,
      vehicle_type: info.vehicle_type,
      register_date: info.register_date ? dayjs(info.register_date) : undefined,
      certificate_date: info.certificate_date ? dayjs(info.certificate_date) : undefined,
    });
    if (info.owner_name) {
      customerApi.setValues({ name: info.owner_name, address: info.owner_address });
    }
    message.success('行驶证正页识别完成，已填入车辆/客户信息');
  } catch (e) {
    opt.onError?.(e as Error);
  }
}

// 行驶证副页：OCR back → 填座位数/油电 + 检验记录追加到备注
async function uploadDrivingBack(opt: any) {
  try {
    const res = await requestClient.upload<{ url: string }>('/upload', {
      file: opt.file as File,
    });
    files.driving_back = res.url;
    opt.onSuccess?.(res);
    const info = await requestClient.get<any>('/ocr/vehicle-license', {
      params: { imageUrl: res.url, side: 'back' },
    });
    vehicleApi.setValues({
      seats: info.seats ? Number(info.seats) : undefined,
      energy_type: info.energy_type || undefined,
    });
    if (info.inspection_record) {
      const vals = await remarkApi.getValues();
      const cur = (vals as Record<string, any>)?.remark || '';
      remarkApi.setValues({
        remark: cur
          ? `${cur}\n[检验记录] ${info.inspection_record}`
          : `[检验记录] ${info.inspection_record}`,
      });
    }
    message.success('行驶证副页识别完成，已填入座位/油电/检验记录');
  } catch (e) {
    opt.onError?.(e as Error);
  }
}

// 身份证正面：OCR front → 填客户
async function uploadSsnFront(opt: any) {
  try {
    const res = await requestClient.upload<{ url: string }>('/upload', {
      file: opt.file as File,
    });
    files.ssn_front = res.url;
    opt.onSuccess?.(res);
    const info = await requestClient.get<any>('/ocr/id-card', {
      params: { imageUrl: res.url, side: 'front' },
    });
    customerApi.setValues({
      name: info.name,
      id_number: info.id_number,
      address: info.address,
      birthday: info.birth ? dayjs(info.birth) : undefined,
    });
    message.success('身份证正面识别完成，已填入客户信息');
  } catch (e) {
    opt.onError?.(e as Error);
  }
}

// 身份证反面：OCR back → 填签发机关/有效期
async function uploadSsnBack(opt: any) {
  try {
    const res = await requestClient.upload<{ url: string }>('/upload', {
      file: opt.file as File,
    });
    files.ssn_back = res.url;
    opt.onSuccess?.(res);
    const info = await requestClient.get<any>('/ocr/id-card', {
      params: { imageUrl: res.url, side: 'back' },
    });
    customerApi.setValues({
      id_authority: info.id_authority,
      id_valid_date: info.id_valid_date,
    });
    message.success('身份证反面识别完成，已填入签发机关/有效期');
  } catch (e) {
    opt.onError?.(e as Error);
  }
}

const OCR_HANDLERS: Record<string, (opt: any) => Promise<void>> = {
  driving_front: uploadDrivingFront,
  driving_back: uploadDrivingBack,
  ssn_front: uploadSsnFront,
  ssn_back: uploadSsnBack,
};

const picUploadProps = (key: string) => ({
  listType: 'picture-card' as const,
  accept: 'image/*',
  multiple: false,
  maxCount: 1,
  fileList: fileLists[key] ?? [],
  onChange: (info: any) => {
    fileLists[key] = info.fileList;
  },
  onRemove: () => {
    files[key] = '';
    fileLists[key] = [];
    return true;
  },
  showUploadButton: (fileLists[key]?.length ?? 0) < 1,
  beforeUpload: () => {
    if ((fileLists[key]?.length ?? 0) >= 1) {
      message.warning('只能上传一张，请先删除已有文件');
      return false;
    }
    return true;
  },
  customRequest: OCR_HANDLERS[key] || makeCustomRequest(key),
});
const docUploadProps = () => ({
  accept: '.doc,.docx,.pdf',
  multiple: false,
  maxCount: 1,
  fileList: fileLists.policy_file ?? [],
  onChange: (info: any) => {
    fileLists.policy_file = info.fileList;
  },
  onRemove: () => {
    files.policy_file = '';
    fileLists.policy_file = [];
    return true;
  },
  showUploadButton: (fileLists.policy_file?.length ?? 0) < 1,
  beforeUpload: () => {
    if ((fileLists.policy_file?.length ?? 0) >= 1) {
      message.warning('只能上传一张，请先删除已有文件');
      return false;
    }
    return true;
  },
  customRequest: makeCustomRequest('policy_file'),
});

async function onSubmit() {
  saving.value = true;
  try {
    const values = await merged.submitAllForm(true);
    if (!values) {
      message.warning('请填写所有必填项');
      return;
    }
    for (const f of DATE_FIELDS) {
      const v = (values as Record<string, any>)[f];
      if (v && dayjs.isDayjs(v)) (values as Record<string, any>)[f] = v.format('YYYY-MM-DD');
    }
    await createPolicyFull({ ...values, ...files });
    message.success('保单创建成功');
    router.push('/policies/query');
  } catch {
    // 错误提示由请求层统一处理
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Page auto-content-height title="保单录入">
    <div class="flex flex-col gap-4">
      <!-- 客户信息 + 身份证正反面（OCR 自动填客户字段） -->
      <Card title="客户信息">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="md:col-span-2">
            <CustomerForm />
          </div>
          <div class="md:col-span-1">
            <div class="mb-2 text-sm text-gray-500">
              身份证（上传后 OCR 自动填表）
            </div>
            <div class="grid grid-cols-2 gap-3">
              <Upload v-bind="picUploadProps('ssn_front')">
                <div class="flex flex-col items-center">
                  <Plus class="size-5" />
                  <div class="mt-1 text-xs">身份证正面</div>
                </div>
              </Upload>
              <Upload v-bind="picUploadProps('ssn_back')">
                <div class="flex flex-col items-center">
                  <Plus class="size-5" />
                  <div class="mt-1 text-xs">身份证反面</div>
                </div>
              </Upload>
            </div>
          </div>
        </div>
      </Card>

      <!-- 车辆信息 + 行驶证正副页（OCR 自动填车辆字段） -->
      <Card title="车辆信息">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="md:col-span-2">
            <VehicleForm />
          </div>
          <div class="md:col-span-1">
            <div class="mb-2 text-sm text-gray-500">
              行驶证（上传后 OCR 自动填表）
            </div>
            <div class="grid grid-cols-2 gap-3">
              <Upload v-bind="picUploadProps('driving_front')">
                <div class="flex flex-col items-center">
                  <Plus class="size-5" />
                  <div class="mt-1 text-xs">行驶证正页</div>
                </div>
              </Upload>
              <Upload v-bind="picUploadProps('driving_back')">
                <div class="flex flex-col items-center">
                  <Plus class="size-5" />
                  <div class="mt-1 text-xs">行驶证副页</div>
                </div>
              </Upload>
            </div>
          </div>
        </div>
      </Card>

      <!-- 保费信息（无对应材料） -->
      <Card title="保费信息">
        <PremiumForm />
      </Card>

      <!-- 手续费与支出（无对应材料） -->
      <Card title="手续费与支出">
        <ChargeForm />
      </Card>

      <!-- 备注 + 其他材料 -->
      <Card title="备注与其他材料">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="md:col-span-2">
            <RemarkForm />
          </div>
          <div class="md:col-span-1 space-y-3">
            <div class="text-sm text-gray-500">其他材料</div>
            <div class="grid grid-cols-2 gap-3">
              <Upload v-bind="picUploadProps('business_license')">
                <div class="flex flex-col items-center">
                  <Plus class="size-5" />
                  <div class="mt-1 text-xs">营业执照</div>
                </div>
              </Upload>
              <Upload v-bind="picUploadProps('quotation')">
                <div class="flex flex-col items-center">
                  <Plus class="size-5" />
                  <div class="mt-1 text-xs">其他承保材料</div>
                </div>
              </Upload>
            </div>
            <Upload v-bind="docUploadProps()">
              <Button>上传电子保单(doc/pdf)</Button>
            </Upload>
          </div>
        </div>
      </Card>

      <div class="flex justify-end gap-3">
        <Button @click="router.back()">取消</Button>
        <Button :loading="saving" type="primary" @click="onSubmit">
          提交
        </Button>
      </div>
    </div>
  </Page>
</template>
