import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getInsuranceCompanyList } from '#/api/insurance-company';
import { getUserList } from '#/api/user';

/** 金额格式化：¥1,234.00（列与 footer 合计共用） */
export function formatMoney(value: any): string {
  return value != null && value !== ''
    ? `¥${Number(value).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '-';
}

/** 顶部搜索表单（后端 keyword 模糊搜 企业名称/项目/负责人/电话） */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: '企业名称 / 项目 / 负责人 / 电话' },
      fieldName: 'keyword',
      label: '关键字',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => (await getUserList({ page: 1, pageSize: 1000 })).items,
        allowClear: true,
        labelField: 'username',
        placeholder: '全部',
        valueField: 'username',
      },
      fieldName: 'salesPerson',
      label: '业务员',
    },
    {
      component: 'RangePicker',
      componentProps: { style: 'width:100%' },
      fieldName: 'createdRange',
      label: '创建时间',
    },
  ];
}

/** 表格列（形态与车保查询一致：一行一张单，金额右对齐，尾列操作） */
export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'enterpriseName', title: '企业名称', width: 180 },
    { field: 'insuranceType', title: '险种', width: 120 },
    { field: 'projectName', title: '项目名称', width: 140 },
    { field: 'personInCharge', title: '负责人', width: 90 },
    { field: 'contactPhone', title: '联系电话', width: 120 },
    {
      align: 'right',
      field: 'sumInsured',
      formatter: ({ cellValue }) => formatMoney(cellValue),
      title: '保额',
      width: 110,
    },
    {
      align: 'right',
      field: 'premium',
      formatter: ({ cellValue }) => formatMoney(cellValue),
      title: '保费',
      width: 110,
    },
    {
      align: 'right',
      field: 'expenses',
      formatter: ({ cellValue }) => formatMoney(cellValue),
      title: '支出',
      width: 110,
    },
    {
      align: 'right',
      field: 'balance',
      formatter: ({ cellValue }) => formatMoney(cellValue),
      title: '结余',
      width: 110,
    },
    { field: 'insuranceCompany', title: '保险公司', width: 120 },
    { field: 'salesPerson', title: '业务员', width: 90 },
    { field: 'startDate', title: '起保时间', width: 110 },
    { field: 'endDate', title: '截止日期', width: 110 },
    {
      field: 'createdAt',
      formatter: ({ cellValue }) =>
        cellValue ? String(cellValue).slice(0, 16) : '-',
      title: '创建时间',
      width: 140,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 140,
    },
  ];
}

/* ============================================================
 * 极速开单抽屉（非车查询页工具栏「开单」入口，modules/quick-create.vue）
 * 单列精简表单；结余 = 保费 - 支出 为联动展示条（非表单字段，后端为准重算）；
 * 附件多文件 URL 逗号拼接存 attachment（与车保 quotation 同方案）。
 * ============================================================ */

/**
 * 极速开单表单。onBalanceChange：保费/支出变化时回调结余（展示条呈现，可为负）。
 */
export function useQuickCreateSchema(
  onBalanceChange?: (balance: number) => void,
): VbenFormSchema[] {
  // 注意：componentProps 第二参 formApi 是 vee-validate FormActions（无 getValues），
  // 读值用第一参 values（响应式表单值）。
  const numLinked = (fieldName: string, label: string): VbenFormSchema => ({
    component: 'InputNumber',
    componentProps: (values: any) => ({
      min: 0,
      style: 'width:100%',
      onChange: (val: any) => {
        const m = { ...values, [fieldName]: val };
        const balance = (Number(m.premium) || 0) - (Number(m.expenses) || 0);
        onBalanceChange?.(Math.round(balance * 100) / 100);
      },
    }),
    fieldName,
    label,
  });
  return [
    {
      component: 'Input',
      componentProps: { placeholder: '企业全称' },
      fieldName: 'enterpriseName',
      label: '企业名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '如：雇主责任险 / 团体意外险 / 财产险' },
      fieldName: 'insuranceType',
      label: '险种',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'projectName', label: '项目名称' },
    {
      component: 'Input',
      fieldName: 'personInCharge',
      label: '负责人',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { maxlength: 11, placeholder: '11 位手机号' },
      fieldName: 'contactPhone',
      label: '联系电话',
      rules: 'required',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width:100%' },
      fieldName: 'sumInsured',
      label: '保额',
    },
    numLinked('premium', '保费'),
    numLinked('expenses', '支出'),
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () =>
          (await getInsuranceCompanyList({ page: 1, pageSize: 1000 })).items,
        labelField: 'name',
        placeholder: '请选择保险公司',
        valueField: 'name',
      },
      fieldName: 'insuranceCompany',
      label: '保险公司',
      rules: 'required',
    },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () => (await getUserList({ page: 1, pageSize: 1000 })).items,
        labelField: 'username',
        placeholder: '请选择业务员',
        valueField: 'username',
      },
      fieldName: 'salesPerson',
      label: '业务员',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: { style: 'width:100%' },
      fieldName: 'startDate',
      label: '起保时间',
      rules: 'required',
    },
    {
      component: 'DatePicker',
      componentProps: { style: 'width:100%' },
      fieldName: 'endDate',
      label: '截止日期',
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: { placeholder: '选填', rows: 2 },
      fieldName: 'remark',
      label: '备注',
    },
  ];
}
