import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

/** 新增/编辑客户表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'name', label: '姓名', rules: 'required' },
    {
      component: 'Input',
      fieldName: 'phone',
      label: '手机号',
      rules: 'required',
    },
    { component: 'Input', fieldName: 'email', label: '邮箱' },
    { component: 'Input', fieldName: 'id_number', label: '身份证号' },
    { component: 'Textarea', fieldName: 'address', label: '地址' },
  ];
}

/** 顶部搜索表单（后端 keyword 模糊搜 name / phone / id_number）*/
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: { placeholder: '姓名 / 手机号 / 身份证号' },
      fieldName: 'keyword',
      label: '关键字',
    },
  ];
}

/** 表格列 */
export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'name', title: '姓名', width: 120 },
    { field: 'phone', title: '手机号', width: 140 },
    { field: 'email', title: '邮箱', width: 220 },
    { field: 'id_number', title: '身份证号', width: 180 },
    { field: 'address', title: '地址', minWidth: 220 },
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
