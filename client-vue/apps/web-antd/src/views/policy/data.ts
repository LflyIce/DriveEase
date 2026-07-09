import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getInsuranceCompanyList } from '#/api/insurance-company';
import { getUserList } from '#/api/user';

/** 保单状态下拉选项（与后端 policy.status CHECK 约束一致） */
export const STATUS_OPTIONS = [
  { label: '生效', value: '生效' },
  { label: '待生效', value: '待生效' },
  { label: '已过期', value: '已过期' },
  { label: '已退保', value: '已退保' },
];

/** 金额格式化：¥1,234.00 */
function formatMoney(value: any): string {
  return value != null && value !== ''
    ? `¥${Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '-';
}

/** 顶部搜索表单（后端 keyword 模糊搜 保单号/客户名/电话/车牌，status 精确匹配） */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: '保单号 / 客户名 / 电话 / 车牌' },
      fieldName: 'keyword',
      label: '关键字',
    },
    {
      component: 'Select',
      componentProps: {
        options: STATUS_OPTIONS,
        allowClear: true,
        placeholder: '全部',
      },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

/** 表格列（形态 A：一行一张保单，列带客户/车辆信息） */
export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'policy_number', title: '保单号', width: 170 },
    { field: 'customer_name', title: '投保人', width: 100 },
    { field: 'customer_phone', title: '电话', width: 130 },
    { field: 'plate_number', title: '车牌号', width: 110 },
    { field: 'insurance_company', title: '保险公司', width: 130 },
    { field: 'insurance_type', title: '险种', width: 90 },
    {
      align: 'right',
      field: 'premium',
      formatter: ({ cellValue }) => formatMoney(cellValue),
      title: '保费',
      width: 120,
    },
    {
      align: 'right',
      field: 'sum_insured',
      formatter: ({ cellValue }) => formatMoney(cellValue),
      title: '保额',
      width: 130,
    },
    { field: 'effective_date', title: '起保日期', width: 120 },
    { field: 'expiry_date', title: '到期日期', width: 120 },
    {
      align: 'center',
      field: 'status',
      slots: { default: 'status' },
      title: '状态',
      width: 90,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 200,
    },
  ];
}

/* ============================================================
 * 以下为录入页（/policies/create）表单 schema —— 按截图分组
 * 多列布局由 create.vue 的 wrapperClass:'grid-cols-2' 控制，
 * 单项跨整行用 formItemClass:'cols-span-full'
 * ============================================================ */

/** 客户跟进状态（多选，存 JSON 数组到 customer.follow_status） */
export const FOLLOW_STATUS_OPTIONS = [
  '已成交', '待追踪', '流失', '待续保', '脱保', '待核实', '询价中',
  '卖车', '已续保', '退保', '报废', '已询价', '待打款',
].map((v) => ({ label: v, value: v }));

export const CUSTOMER_TYPE_OPTIONS = [
  '直接客户', '渠道客户', '代理人客户', '转介绍', '个人客户', '公司客户',
].map((v) => ({ label: v, value: v }));

export const VEHICLE_TYPE_OPTIONS = [
  '私家车', '营业客车', '企业非营业客车', '0-1吨箱式货车', '2-10吨货车',
  '10吨以上货车', '企业非营业货车', '非营业货车', '营业货车', '牵引货车',
  '冷藏车', '清障车', '随车吊', '吊车', '危险品运输车',
].map((v) => ({ label: v, value: v }));

export const ENERGY_OPTIONS = [
  { label: '油车', value: '油车' },
  { label: '电车', value: '电车' },
  { label: '天然气', value: '天然气' },
];

export const TRANSFER_OPTIONS = [
  { label: '是', value: 'Y' },
  { label: '否', value: 'N' },
];

/** 客户信息分组 */
export function useCustomerSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '客户名称',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: CUSTOMER_TYPE_OPTIONS,
        placeholder: '请选择客户类型',
      },
      fieldName: 'customer_type',
      label: '客户类型',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'id_number', label: '身份证/信用代码' },
    { component: 'Input', fieldName: 'id_authority', label: '签发机关' },
    { component: 'Input', fieldName: 'id_valid_date', label: '证件有效期' },
    { component: 'Input', fieldName: 'phone', label: '手机号码' },
    { component: 'DatePicker', fieldName: 'birthday', label: '客户生日' },
    {
      component: 'RadioGroup',
      componentProps: { options: TRANSFER_OPTIONS },
      defaultValue: 'N',
      fieldName: 'transfer_flag',
      label: '过户标识',
    },
    {
      component: 'CheckboxGroup',
      componentProps: { options: FOLLOW_STATUS_OPTIONS },
      fieldName: 'follow_status',
      formItemClass: 'cols-span-full',
      label: '状态',
    },
    { component: 'Input', fieldName: 'business_attribution', label: '业务归属' },
    { component: 'Input', fieldName: 'business_area', label: '业务归属地' },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => (await getUserList({ page: 1, pageSize: 1000 })).items,
        labelField: 'username',
        placeholder: '请选择业务员',
        valueField: 'username',
      },
      fieldName: 'sales_person',
      label: '业务员',
    },
    {
      component: 'Textarea',
      componentProps: { placeholder: '请输入详细地址' },
      fieldName: 'address',
      formItemClass: 'cols-span-full',
      label: '详细地址',
    },
  ];
}

/** 车辆信息分组 */
export function useVehicleSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'plate_number',
      label: '车牌号',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'vin', label: '车架号', rules: 'required' },
    {
      component: 'Input',
      fieldName: 'engine_number',
      label: '发动机号',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'brand_model', label: '厂牌型号' },
    {
      component: 'RadioGroup',
      componentProps: {
        buttonStyle: 'solid',
        optionType: 'button',
        options: ENERGY_OPTIONS,
      },
      fieldName: 'energy_type',
      label: '油电分类',
    },
    {
      component: 'Select',
      componentProps: {
        options: VEHICLE_TYPE_OPTIONS,
        placeholder: '请选择车辆种类',
        showSearch: true,
      },
      fieldName: 'vehicle_type',
      label: '车辆种类',
    },
    {
      component: 'DatePicker',
      fieldName: 'register_date',
      label: '初登日期',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      fieldName: 'certificate_date',
      label: '发证日期',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width:100%' },
      fieldName: 'seats',
      label: '座位数',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width:100%' },
      fieldName: 'load_capacity',
      label: '核定载质量',
    },
    { component: 'DatePicker', fieldName: 'next_inspection_date', label: '下次年审' },
  ];
}

/** 保费信息分组 */
export function usePremiumSchema(): VbenFormSchema[] {
  const num = (fieldName: string, label: string): VbenFormSchema => ({
    component: 'InputNumber',
    componentProps: { min: 0, style: 'width:100%' },
    fieldName,
    label,
  });
  return [
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () =>
          (await getInsuranceCompanyList({ page: 1, pageSize: 1000 })).items,
        labelField: 'name',
        placeholder: '请选择保险公司',
        valueField: 'name',
      },
      fieldName: 'insurance_company',
      label: '保险公司',
    },
    {
      component: 'DatePicker',
      fieldName: 'policy_date',
      label: '投保日期',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      fieldName: 'expiry_date',
      label: '到期日期',
      rules: 'required',
    },
    num('traffic_premium', '交强险保费'),
    num('travel_tax', '车船税'),
    num('commercial_premium', '商业险保费'),
    num('surcharge_premium', '非车保费'),
    num('surcharge_premium2', '非车2保费'),
    num('premium', '合计保费'),
  ];
}

/** 手续费与支出分组 */
export function useChargeSchema(): VbenFormSchema[] {
  const num = (fieldName: string, label: string): VbenFormSchema => ({
    component: 'InputNumber',
    componentProps: { min: 0, style: 'width:100%' },
    fieldName,
    label,
  });
  return [
    num('commission', '手续费'),
    num('expenses', '支出'),
    num('traffic_rate', '交强费率'),
    num('traffic_charge', '交强手续费'),
    num('commercial_rate', '商业费率'),
    num('commercial_charge', '商业手续费'),
    num('surcharge_rate', '非车费率'),
    num('surcharge_charge', '非车手续费'),
    num('surcharge_rate2', '非车2费率'),
    num('surcharge_charge2', '非车2手续费'),
    num('total_charge', '手续费总计'),
  ];
}

/** 备注分组 */
export function useRemarkSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Textarea',
      componentProps: { placeholder: '请输入备注', rows: 3 },
      fieldName: 'remark',
      formItemClass: 'cols-span-full',
      label: '备注',
    },
  ];
}
