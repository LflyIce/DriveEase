<script lang="ts" setup>
import type { PolicyApi } from '#/api/policy';

import { computed, ref } from 'vue';

import {
  Descriptions,
  DescriptionsItem,
  Drawer,
  Image,
  Spin,
  Tag,
} from 'ant-design-vue';

import { getPolicy } from '#/api/policy';

defineOptions({ name: 'PolicyDetail' });

// antd Image 预览组子组件：模板里用 <ImagePreviewGroup> 包住证件照片，共享灯箱左右切换
const ImagePreviewGroup = Image.PreviewGroup;

const open = ref(false);
const loading = ref(false);
const detail = ref<null | PolicyApi.Policy>(null);

/** 状态 → 标签颜色（生效绿/待生效蓝/已过期灰/已退保红） */
const STATUS_COLOR: Record<string, string> = {
  生效: 'green',
  待生效: 'blue',
  已过期: 'default',
  已退保: 'red',
};

function formatMoney(value: any): string {
  return value != null && value !== ''
    ? `¥${Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '-';
}

function orDash(v: any): string {
  return v === null || v === undefined || v === '' ? '-' : String(v);
}

// follow_status 存 JSON.stringify(['已成交',...])，解析成「、」连接
function formatFollowStatus(v?: null | string): string {
  if (!v) return '-';
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.join('、') : String(v);
  } catch {
    return v;
  }
}

function formatTransfer(v?: null | string): string {
  if (v === 'Y') return '是';
  if (v === 'N') return '否';
  return '-';
}

// compulsory_detail / commercial_detail：TEXT 存 JSON 字符串，解析成 [{name, amount}]，失败返回 null
function parseDetailItems(
  v?: null | string,
): null | { amount: any; name: string }[] {
  if (!v) return null;
  try {
    const parsed = JSON.parse(v);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((it: any) => ({
      amount: it?.amount ?? it?.value ?? it?.premium ?? '',
      name: it?.name ?? it?.label ?? it?.type ?? '项',
    }));
  } catch {
    return null;
  }
}

const compulsoryItems = computed(() =>
  parseDetailItems(detail.value?.compulsoryDetail),
);
const commercialItems = computed(() =>
  parseDetailItems(detail.value?.commercialDetail),
);

// 证件材料：6 张图（固定大小、不可放大）+ 1 个电子保单链接
const materials = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: '身份证正面', type: 'image', url: d.customer?.ssnFront ?? null },
    { label: '身份证反面', type: 'image', url: d.customer?.ssnBack ?? null },
    { label: '营业执照', type: 'image', url: d.customer?.businessLicense ?? null },
    { label: '行驶证正页', type: 'image', url: d.vehicle?.drivingFront ?? null },
    { label: '行驶证副页', type: 'image', url: d.vehicle?.drivingBack ?? null },
    { label: '其他承保材料', type: 'image', url: d.quotation ?? null },
    { label: '电子保单', type: 'file', url: d.policyFile ?? null },
  ] as { label: string; type: 'file' | 'image'; url: null | string }[];
});

async function show(id: number) {
  open.value = true;
  loading.value = true;
  detail.value = null;
  try {
    detail.value = await getPolicy(id);
  } finally {
    loading.value = false;
  }
}

defineExpose({ show });
</script>

<template>
  <Drawer v-model:open="open" title="保单详情" :width="720">
    <Spin :spinning="loading">
      <template v-if="detail">
        <!-- 1. 基础信息 -->
        <Descriptions :column="2" bordered size="small" title="基础信息">
          <DescriptionsItem label="保单号">
            {{ detail.policyNumber }}
          </DescriptionsItem>
          <DescriptionsItem label="状态">
            <Tag :color="STATUS_COLOR[detail.status]">{{ detail.status }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="险种">
            {{ detail.insuranceType }}
          </DescriptionsItem>
          <DescriptionsItem label="投保日期">
            {{ orDash(detail.policyDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="起保日期">
            {{ orDash(detail.effectiveDate || detail.startDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="到期日期">
            {{ orDash(detail.expiryDate || detail.endDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="开单时间">
            {{ orDash(detail.issueTime) }}
          </DescriptionsItem>
          <DescriptionsItem label="证件类型">
            {{ orDash(detail.certificateType) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="证件号码">
            {{ orDash(detail.certificateNumber) }}
          </DescriptionsItem>
          <DescriptionsItem label="保费">
            {{ formatMoney(detail.premium) }}
          </DescriptionsItem>
          <DescriptionsItem label="保额">
            {{ formatMoney(detail.sumInsured) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="创建时间">
            {{ orDash(detail.createdAt) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 2. 投保人 -->
        <Descriptions
          v-if="detail.customer"
          :column="2"
          bordered
          class="mt-4"
          size="small"
          title="投保人"
        >
          <DescriptionsItem label="姓名">
            {{ detail.customer.name }}
          </DescriptionsItem>
          <DescriptionsItem label="电话">
            {{ detail.customer.phone }}
          </DescriptionsItem>
          <DescriptionsItem label="证件号">
            {{ orDash(detail.customer.idNumber) }}
          </DescriptionsItem>
          <DescriptionsItem label="邮箱">
            {{ orDash(detail.customer.email) }}
          </DescriptionsItem>
          <DescriptionsItem label="签发机关">
            {{ orDash(detail.customer.idAuthority) }}
          </DescriptionsItem>
          <DescriptionsItem label="证件有效期">
            {{ orDash(detail.customer.idValidDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="生日">
            {{ orDash(detail.customer.birthday) }}
          </DescriptionsItem>
          <DescriptionsItem label="客户类型">
            {{ orDash(detail.customer.customerType) }}
          </DescriptionsItem>
          <DescriptionsItem label="业务归属">
            {{ orDash(detail.customer.businessAttribution) }}
          </DescriptionsItem>
          <DescriptionsItem label="业务归属地">
            {{ orDash(detail.customer.businessArea) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="跟进状态">
            {{ formatFollowStatus(detail.customer.followStatus) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="详细地址">
            {{ orDash(detail.customer.address) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 3. 被保车辆 -->
        <Descriptions
          v-if="detail.vehicle"
          :column="2"
          bordered
          class="mt-4"
          size="small"
          title="被保车辆"
        >
          <DescriptionsItem label="车牌号">
            {{ detail.vehicle.plateNumber }}
          </DescriptionsItem>
          <DescriptionsItem label="品牌型号">
            {{
              orDash(
                detail.vehicle.brandModel ||
                  [detail.vehicle.brand, detail.vehicle.model]
                    .filter(Boolean)
                    .join(' '),
              )
            }}
          </DescriptionsItem>
          <DescriptionsItem label="车架号">
            {{ orDash(detail.vehicle.vin) }}
          </DescriptionsItem>
          <DescriptionsItem label="发动机号">
            {{ orDash(detail.vehicle.engineNumber) }}
          </DescriptionsItem>
          <DescriptionsItem label="年份">
            {{ orDash(detail.vehicle.year) }}
          </DescriptionsItem>
          <DescriptionsItem label="油电分类">
            {{ orDash(detail.vehicle.energyType) }}
          </DescriptionsItem>
          <DescriptionsItem label="车辆种类">
            {{ orDash(detail.vehicle.vehicleType) }}
          </DescriptionsItem>
          <DescriptionsItem label="座位数">
            {{ orDash(detail.vehicle.seats) }}
          </DescriptionsItem>
          <DescriptionsItem label="核定载质量">
            {{ orDash(detail.vehicle.loadCapacity) }}
          </DescriptionsItem>
          <DescriptionsItem label="过户">
            {{ formatTransfer(detail.vehicle.transferFlag) }}
          </DescriptionsItem>
          <DescriptionsItem label="初登日期">
            {{ orDash(detail.vehicle.registerDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="发证日期">
            {{ orDash(detail.vehicle.certificateDate) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="下次年审">
            {{ orDash(detail.vehicle.nextInspectionDate) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 4. 保费明细 -->
        <Descriptions
          :column="2"
          bordered
          class="mt-4"
          size="small"
          title="保费明细"
        >
          <DescriptionsItem label="交强险保费">
            {{ formatMoney(detail.trafficPremium) }}
          </DescriptionsItem>
          <DescriptionsItem label="车船税">
            {{ formatMoney(detail.travelTax) }}
          </DescriptionsItem>
          <DescriptionsItem label="商业险保费">
            {{ formatMoney(detail.commercialPremium) }}
          </DescriptionsItem>
          <DescriptionsItem label="非车保费">
            {{ formatMoney(detail.surchargePremium) }}
          </DescriptionsItem>
          <DescriptionsItem label="非车2保费">
            {{ formatMoney(detail.surchargePremium2) }}
          </DescriptionsItem>
          <DescriptionsItem label="合计保费">
            {{ formatMoney(detail.premium) }}
          </DescriptionsItem>
          <DescriptionsItem
            v-if="compulsoryItems?.length"
            :span="2"
            label="交强明细"
          >
            <span
              v-for="(it, i) in compulsoryItems"
              :key="i"
              class="mr-3 inline-block"
            >
              {{ it.name }}：{{ it.amount || '-' }}
            </span>
          </DescriptionsItem>
          <DescriptionsItem
            v-if="commercialItems?.length"
            :span="2"
            label="商业明细"
          >
            <span
              v-for="(it, i) in commercialItems"
              :key="i"
              class="mr-3 inline-block"
            >
              {{ it.name }}：{{ it.amount || '-' }}
            </span>
          </DescriptionsItem>
        </Descriptions>

        <!-- 5. 手续费与支出 -->
        <Descriptions
          :column="2"
          bordered
          class="mt-4"
          size="small"
          title="手续费与支出"
        >
          <DescriptionsItem label="手续费">
            {{ formatMoney(detail.commission) }}
          </DescriptionsItem>
          <DescriptionsItem label="支出">
            {{ formatMoney(detail.expenses) }}
          </DescriptionsItem>
          <DescriptionsItem label="交强费率">
            {{ orDash(detail.trafficRate) }}
          </DescriptionsItem>
          <DescriptionsItem label="交强手续费">
            {{ formatMoney(detail.trafficCharge) }}
          </DescriptionsItem>
          <DescriptionsItem label="商业费率">
            {{ orDash(detail.commercialRate) }}
          </DescriptionsItem>
          <DescriptionsItem label="商业手续费">
            {{ formatMoney(detail.commercialCharge) }}
          </DescriptionsItem>
          <DescriptionsItem label="非车费率">
            {{ orDash(detail.surchargeRate) }}
          </DescriptionsItem>
          <DescriptionsItem label="非车手续费">
            {{ formatMoney(detail.surchargeCharge) }}
          </DescriptionsItem>
          <DescriptionsItem label="非车2费率">
            {{ orDash(detail.surchargeRate2) }}
          </DescriptionsItem>
          <DescriptionsItem label="非车2手续费">
            {{ formatMoney(detail.surchargeCharge2) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="手续费总计">
            {{ formatMoney(detail.totalCharge) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 6. 保险公司 / 其他 -->
        <Descriptions
          :column="2"
          bordered
          class="mt-4"
          size="small"
          title="保险公司 / 其他"
        >
          <DescriptionsItem label="保险公司">
            {{ orDash(detail.insuranceCompany) }}
          </DescriptionsItem>
          <DescriptionsItem label="业务员">
            {{ orDash(detail.salesPerson) }}
          </DescriptionsItem>
          <DescriptionsItem label="联系人">
            {{ orDash(detail.contactPerson) }}
          </DescriptionsItem>
          <DescriptionsItem label="联系电话">
            {{ orDash(detail.contactPhone) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="备注">
            {{ orDash(detail.remark) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 7. 证件材料 -->
        <div class="mt-4">
          <div class="mb-2 text-sm font-medium">证件材料</div>
          <ImagePreviewGroup>
            <div class="grid grid-cols-3 gap-3">
              <div
                v-for="m in materials"
                :key="m.label"
                class="flex flex-col items-center"
              >
                <div class="mb-1 text-xs text-gray-500">{{ m.label }}</div>
                <div
                  class="flex h-[90px] w-[120px] items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50"
                >
                  <Image
                    v-if="m.url && m.type === 'image'"
                    :height="90"
                    :src="m.url"
                    :width="120"
                  />
                  <a
                    v-else-if="m.url && m.type === 'file'"
                    :href="m.url"
                    target="_blank"
                    class="px-2 text-center text-xs text-blue-600"
                  >
                    查看文件
                  </a>
                  <span v-else class="text-xs text-gray-400">未上传</span>
                </div>
              </div>
            </div>
          </ImagePreviewGroup>
        </div>
      </template>
    </Spin>
  </Drawer>
</template>
