<script lang="ts" setup>
import type { PolicyApi } from '#/api/policy';

import { ref } from 'vue';

import {
  Descriptions,
  DescriptionsItem,
  Drawer,
  Spin,
  Tag,
} from 'ant-design-vue';

import { getPolicy } from '#/api/policy';

defineOptions({ name: 'PolicyDetail' });

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
  <Drawer v-model:open="open" title="保单详情" :width="560">
    <Spin :spinning="loading">
      <Descriptions
        v-if="detail"
        :column="2"
        bordered
        size="small"
        title="基础信息"
      >
        <DescriptionsItem label="保单号">
          {{ detail.policy_number }}
        </DescriptionsItem>
        <DescriptionsItem label="状态">
          <Tag :color="STATUS_COLOR[detail.status]">{{ detail.status }}</Tag>
        </DescriptionsItem>
        <DescriptionsItem label="险种">
          {{ detail.insurance_type }}
        </DescriptionsItem>
        <DescriptionsItem label="保单日期">
          {{ detail.policy_date || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="起保日期">
          {{ detail.effective_date || detail.start_date || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="到期日期">
          {{ detail.expiry_date || detail.end_date || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="保费">
          {{ formatMoney(detail.premium) }}
        </DescriptionsItem>
        <DescriptionsItem label="保额">
          {{ formatMoney(detail.sum_insured) }}
        </DescriptionsItem>
      </Descriptions>

      <Descriptions
        v-if="detail?.customer"
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
          {{ detail.customer.id_number || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="邮箱">
          {{ detail.customer.email || '-' }}
        </DescriptionsItem>
      </Descriptions>

      <Descriptions
        v-if="detail?.vehicle"
        :column="2"
        bordered
        class="mt-4"
        size="small"
        title="被保车辆"
      >
        <DescriptionsItem label="车牌号">
          {{ detail.vehicle.plate_number }}
        </DescriptionsItem>
        <DescriptionsItem label="品牌型号">
          {{ detail.vehicle.brand }} {{ detail.vehicle.model }}
        </DescriptionsItem>
        <DescriptionsItem label="年份">
          {{ detail.vehicle.year || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="VIN">
          {{ detail.vehicle.vin || '-' }}
        </DescriptionsItem>
      </Descriptions>

      <Descriptions
        v-if="detail"
        :column="2"
        bordered
        class="mt-4"
        size="small"
        title="保险公司 / 其他"
      >
        <DescriptionsItem label="保险公司">
          {{ detail.insurance_company || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="联系人">
          {{ detail.contact_person || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="联系电话">
          {{ detail.contact_phone || '-' }}
        </DescriptionsItem>
        <DescriptionsItem label="销售人员">
          {{ detail.sales_person || '-' }}
        </DescriptionsItem>
        <DescriptionsItem :span="2" label="开单时间">
          {{ detail.issue_time || '-' }}
        </DescriptionsItem>
        <DescriptionsItem :span="2" label="备注">
          {{ detail.remark || '-' }}
        </DescriptionsItem>
      </Descriptions>
    </Spin>
  </Drawer>
</template>
