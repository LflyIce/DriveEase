import React, { useRef } from 'react';
import { Button, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../../services/api';

export default function CustomerPage() {
  const actionRef = useRef();
  const [modalVisit, setModalVisit] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState(null);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: '手机号', dataIndex: 'phone', width: 140 },
    { title: '邮箱', dataIndex: 'email', width: 180, search: false },
    { title: '身份证号', dataIndex: 'id_number', width: 180, search: false },
    { title: '地址', dataIndex: 'address', width: 200, search: false, ellipsis: true },
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
          title="确认删除该客户？"
          onConfirm={async () => {
            await deleteCustomer(row.id);
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
        headerTitle="客户管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, keyword, ...rest } = params;
          const res = await getCustomers({ page: current, pageSize, keyword, ...rest });
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
            新建客户
          </Button>,
        ]}
        pagination={{ defaultPageSize: 10 }}
      />

      <ModalForm
        title={editingRow ? '编辑客户' : '新建客户'}
        open={modalVisit}
        onOpenChange={setModalVisit}
        initialValues={editingRow || {}}
        onFinish={async (values) => {
          if (editingRow) {
            await updateCustomer(editingRow.id, values);
            message.success('更新成功');
          } else {
            await createCustomer(values);
            message.success('创建成功');
          }
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="姓名" rules={[{ required: true }]} width="md" />
        <ProFormText name="phone" label="手机号" rules={[{ required: true }]} width="md" />
        <ProFormText name="email" label="邮箱" width="md" />
        <ProFormText name="id_number" label="身份证号" width="md" />
        <ProFormTextArea name="address" label="地址" width="md" />
      </ModalForm>
    </>
  );
}
