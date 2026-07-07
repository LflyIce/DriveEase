import React, { useRef, useState } from 'react';
import { Button, message, Popconfirm, Tag, Row, Col, Card, Statistic } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api';

export default function UserPage() {
  const actionRef = useRef();
  const [modalVisit, setModalVisit] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const columns = [
    { title: '序号', dataIndex: 'id', width: 60, search: false },
    { title: '用户名', dataIndex: 'username', width: 120 },
    { title: '邮箱', dataIndex: 'email', width: 200, search: false },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    {
      title: '角色',
      dataIndex: 'role',
      width: 100,
      valueType: 'select',
      valueEnum: {
        '管理员': { text: '管理员', status: 'Success' },
        '普通员工': { text: '普通员工', status: 'Default' },
      },
      render: (_, row) => (
        <Tag color={row.role === '管理员' ? 'blue' : 'default'}>{row.role}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      valueEnum: {
        '启用': { text: '启用', status: 'Success' },
        '禁用': { text: '禁用', status: 'Error' },
      },
      render: (_, row) => (
        <Tag color={row.status === '启用' ? 'green' : 'red'}>{row.status}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      render: (_, row) => [
        <Button
          key="edit"
          type="link"
          onClick={() => {
            setEditingRow(row);
            setModalVisit(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="del"
          title="确认删除该用户？"
          onConfirm={async () => {
            await deleteUser(row.id);
            message.success('删除成功');
            actionRef.current?.reload();
          }}
        >
          <Button type="link" danger>删除</Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable
        headerTitle="用户管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, keyword, role, status } = params;
          const res = await getUsers({ page: current, pageSize, keyword, role, status });
          return { data: res.data, total: res.total, success: true };
        }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingRow(null);
              setModalVisit(true);
            }}
          >
            添加用户
          </Button>,
        ]}
        pagination={{ defaultPageSize: 10 }}
      />

      <ModalForm
        title={editingRow ? '编辑用户' : '添加用户'}
        open={modalVisit}
        onOpenChange={setModalVisit}
        initialValues={editingRow || {}}
        onFinish={async (values) => {
          if (editingRow) {
            await updateUser(editingRow.id, values);
            message.success('更新成功');
          } else {
            await createUser(values);
            message.success('创建成功');
          }
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="username" label="用户名" rules={[{ required: true }]} width="md" disabled={!!editingRow} />
        <ProFormText.Password
          name="password"
          label={editingRow ? '密码（留空不修改）' : '密码'}
          rules={editingRow ? [] : [{ required: true }]}
          width="md"
        />
        <ProFormText name="email" label="邮箱" width="md" />
        <ProFormText name="phone" label="手机号" width="md" />
        <ProFormSelect
          name="role"
          label="角色"
          rules={[{ required: true }]}
          options={[
            { label: '管理员', value: '管理员' },
            { label: '普通员工', value: '普通员工' },
          ]}
          width="md"
        />
        <ProFormSelect
          name="status"
          label="状态"
          rules={[{ required: true }]}
          options={[
            { label: '启用', value: '启用' },
            { label: '禁用', value: '禁用' },
          ]}
          width="md"
        />
      </ModalForm>
    </>
  );
}
