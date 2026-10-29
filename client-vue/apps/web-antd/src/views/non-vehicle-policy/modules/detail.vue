<script lang="ts" setup>
import type { NonVehiclePolicyApi } from '#/api/non-vehicle-policy';

import { computed, ref } from 'vue';

import {
  Descriptions,
  DescriptionsItem,
  Drawer,
  Image,
  Spin,
} from 'ant-design-vue';

import { getNonVehiclePolicy } from '#/api/non-vehicle-policy';

defineOptions({ name: 'NonVehicleDetail' });

// antd Image 预览组子组件：附件共享灯箱左右切换
const ImagePreviewGroup = Image.PreviewGroup;

const open = ref(false);
const loading = ref(false);
const detail = ref<null | NonVehiclePolicyApi.NonVehiclePolicy>(null);

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

// 附件：attachment 存逗号拼接 URL，拆开逐张展示（多张时标签带序号）
const attachments = computed(() => {
  const urls = (detail.value?.attachment ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  return urls.map((url, i) => ({
    label: urls.length > 1 ? `附件${i + 1}` : '附件',
    url,
  }));
});

async function show(id: number) {
  open.value = true;
  loading.value = true;
  detail.value = null;
  try {
    detail.value = await getNonVehiclePolicy(id);
  } finally {
    loading.value = false;
  }
}

defineExpose({ show });
</script>

<template>
  <Drawer v-model:open="open" title="非车保单详情" :width="720">
    <Spin :spinning="loading">
      <template v-if="detail">
        <Descriptions :column="2" bordered size="small" title="基本信息">
          <DescriptionsItem :span="2" label="企业名称">
            {{ detail.enterpriseName }}
          </DescriptionsItem>
          <DescriptionsItem label="险种">
            {{ detail.insuranceType }}
          </DescriptionsItem>
          <DescriptionsItem label="项目名称">
            {{ orDash(detail.projectName) }}
          </DescriptionsItem>
          <DescriptionsItem label="负责人">
            {{ orDash(detail.personInCharge) }}
          </DescriptionsItem>
          <DescriptionsItem label="联系电话">
            {{ orDash(detail.contactPhone) }}
          </DescriptionsItem>
          <DescriptionsItem label="保额">
            {{ formatMoney(detail.sumInsured) }}
          </DescriptionsItem>
          <DescriptionsItem label="保费">
            {{ formatMoney(detail.premium) }}
          </DescriptionsItem>
          <DescriptionsItem label="费用">
            {{ formatMoney(detail.fee) }}
          </DescriptionsItem>
          <DescriptionsItem label="支出">
            {{ formatMoney(detail.expenses) }}
          </DescriptionsItem>
          <DescriptionsItem label="结余">
            {{ formatMoney(detail.balance) }}
          </DescriptionsItem>
          <DescriptionsItem label="保险公司">
            {{ orDash(detail.insuranceCompany) }}
          </DescriptionsItem>
          <DescriptionsItem label="业务员">
            {{ orDash(detail.salesPerson) }}
          </DescriptionsItem>
          <DescriptionsItem label="起保时间">
            {{ orDash(detail.startDate) }}
          </DescriptionsItem>
          <DescriptionsItem label="截止日期">
            {{ orDash(detail.endDate) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="创建时间">
            {{ orDash(detail.createdAt) }}
          </DescriptionsItem>
          <DescriptionsItem :span="2" label="备注">
            {{ orDash(detail.remark) }}
          </DescriptionsItem>
        </Descriptions>

        <!-- 附件：逐张预览，共享灯箱 -->
        <div v-if="attachments.length" class="mt-4">
          <div class="mb-2 text-sm">附件</div>
          <ImagePreviewGroup>
            <div class="flex flex-wrap gap-3">
              <Image
                v-for="att in attachments"
                :key="att.url"
                :src="att.url"
                :title="att.label"
                class="h-24 w-24 rounded-md object-cover"
              />
            </div>
          </ImagePreviewGroup>
        </div>
      </template>
    </Spin>
  </Drawer>
</template>
