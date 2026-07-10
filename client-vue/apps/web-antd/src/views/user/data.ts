import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

const ROLE_OPTIONS = [
  { label: '管理员', value: '管理员' },
  { label: '普通员工', value: '普通员工' },
];
const STATUS_OPTIONS = [
  { label: '启用', value: '启用' },
  { label: '禁用', value: '禁用' },
];

export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
    },
    {
      component: 'InputPassword',
      componentProps: {
        autocomplete: 'new-password',
        placeholder: '留空：新建默认 123456 / 编辑不修改',
      },
      fieldName: 'password',
      label: '密码',
    },
    { component: 'Input', fieldName: 'email', label: '邮箱' },
    { component: 'Input', fieldName: 'phone', label: '手机号' },
    {
      component: 'Select',
      componentProps: { options: ROLE_OPTIONS },
      defaultValue: '普通员工',
      fieldName: 'role',
      label: '角色',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: { options: STATUS_OPTIONS },
      defaultValue: '启用',
      fieldName: 'status',
      label: '状态',
      rules: 'required',
    },
  ];
}

export function useGridFormSchema(): VbenFormSchema[] {
  return [
    { component: 'Input', fieldName: 'keyword', label: '关键字' },
    {
      component: 'Select',
      componentProps: { options: ROLE_OPTIONS, allowClear: true },
      fieldName: 'role',
      label: '角色',
    },
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
    { field: 'username', title: '用户名', width: 120 },
    { field: 'role', title: '角色', width: 100 },
    { field: 'status', title: '状态', width: 90 },
    { field: 'email', title: '邮箱', minWidth: 200 },
    { field: 'phone', title: '手机号', width: 140 },
    { field: 'createdAt', title: '创建时间', width: 170 },
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
