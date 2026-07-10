import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

const STATUS_OPTIONS = [
  { label: '启用', value: '启用' },
  { label: '禁用', value: '禁用' },
];

export function useFormSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'name', label: '险种名称', rules: 'required' },
    {
      component: 'Select',
      componentProps: { options: STATUS_OPTIONS },
      defaultValue: '启用',
      fieldName: 'status',
      label: '状态',
    },
    {
      component: 'InputNumber',
      componentProps: { min: 0, style: 'width:100%' },
      defaultValue: 0,
      fieldName: 'sortOrder',
      label: '排序',
    },
    { component: 'Textarea', fieldName: 'remark', label: '备注' },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'keyword', label: '名称' },
    {
      component: 'Select',
      componentProps: { options: STATUS_OPTIONS, allowClear: true },
      fieldName: 'status',
      label: '状态',
    },
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'name', title: '险种名称', minWidth: 160 },
    { field: 'status', title: '状态', width: 90 },
    { field: 'sortOrder', title: '排序', width: 80 },
    { field: 'remark', title: '备注', minWidth: 160 },
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
