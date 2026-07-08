import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getCustomerList } from '#/api/customer';

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'plate_number',
      label: '车牌号',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'brand', label: '品牌', rules: 'required' },
    { component: 'Input', fieldName: 'model', label: '型号', rules: 'required' },
    {
      component: 'InputNumber',
      componentProps: { max: 2100, min: 1900, style: 'width:100%' },
      fieldName: 'year',
      label: '年份',
    },
    { component: 'Input', fieldName: 'vin', label: 'VIN' },
    { component: 'Input', fieldName: 'engine_number', label: '发动机号' },
    {
      component: 'ApiSelect',
      componentProps: {
        api: async () =>
          (await getCustomerList({ page: 1, pageSize: 1000 })).items,
        labelField: 'name',
        placeholder: '选择客户',
        valueField: 'id',
      },
      fieldName: 'customer_id',
      label: '所属客户',
      rules: 'required',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: '车牌号 / 品牌 / VIN' },
      fieldName: 'keyword',
      label: '关键字',
    },
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'plate_number', title: '车牌号', width: 120 },
    { field: 'brand', title: '品牌', width: 110 },
    { field: 'model', title: '型号', width: 120 },
    { field: 'year', title: '年份', width: 80 },
    { field: 'vin', title: 'VIN', minWidth: 180 },
    { field: 'customer_name', title: '所属客户', width: 120 },
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
