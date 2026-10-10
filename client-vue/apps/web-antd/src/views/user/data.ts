import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

import { getRoleOptions } from '#/api/rbac';

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
    { component: 'Input', fieldName: 'phone', label: '手机号', rules: 'required' },
    {
      // 角色来自角色管理（RBAC），动态拉取；提交 roleId，名称由后端按 roleId 回填
      component: 'ApiSelect',
      componentProps: {
        api: getRoleOptions,
        labelField: 'name',
        placeholder: '请选择角色',
        valueField: 'id',
      },
      fieldName: 'roleId',
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
      // 搜索按角色名过滤（后端 u.role = :role），valueField 用 name
      component: 'ApiSelect',
      componentProps: {
        api: getRoleOptions,
        allowClear: true,
        labelField: 'name',
        placeholder: '全部',
        valueField: 'name',
      },
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
