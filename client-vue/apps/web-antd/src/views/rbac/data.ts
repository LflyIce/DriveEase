import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns } from '#/adapter/vxe-table';

/** 角色新增/编辑表单（编辑时 code 由后端忽略，仅改 name/description） */
export function useRoleFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'name',
      label: '角色名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: { placeholder: '英文标识，如 sales（新建后不可改）' },
      fieldName: 'code',
      label: '角色编码',
      rules: 'required',
    },
    {
      component: 'Textarea',
      fieldName: 'description',
      label: '描述',
    },
  ];
}

export function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', width: 70 },
    { field: 'name', title: '角色名称', width: 140 },
    { field: 'code', title: '编码', width: 160 },
    { field: 'description', title: '描述', minWidth: 180 },
    {
      field: 'isBuiltIn',
      slots: { default: 'builtIn' },
      title: '类型',
      width: 90,
    },
    {
      field: 'permissions',
      slots: { default: 'permCount' },
      title: '权限',
      width: 90,
    },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: '操作',
      width: 240,
    },
  ];
}
