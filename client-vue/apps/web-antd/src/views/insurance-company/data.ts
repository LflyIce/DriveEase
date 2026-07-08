import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

export function useFormSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'name', label: '公司名称', rules: 'required' },
    { component: 'Input', fieldName: 'contact_person', label: '联系人' },
    { component: 'Input', fieldName: 'contact_phone', label: '联系电话' },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: '公司名称 / 联系人 / 电话' },
      fieldName: 'keyword',
      label: '关键字',
    },
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'name', title: '公司名称', minWidth: 180 },
    { field: 'contact_person', title: '联系人', width: 120 },
    { field: 'contact_phone', title: '联系电话', width: 140 },
    { field: 'created_at', title: '创建时间', width: 170 },
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
