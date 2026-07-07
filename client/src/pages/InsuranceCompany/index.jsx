import React, { useRef, useState } from 'react';
import { Button, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ModalForm, ProFormText, ProTable } from '@ant-design/pro-components';
import {
  createInsuranceCompany,
  deleteInsuranceCompany,
  getInsuranceCompanies,
  updateInsuranceCompany,
} from '../../services/api';

export default function InsuranceCompanyPage() {
  const actionRef = useRef();
  const [modalVisit, setModalVisit] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const columns = [
    { title: '序号', dataIndex: 'id', width: 70, search: false },
    { title: '公司名称', dataIndex: 'name', width: 220 },
    { title: '联系人', dataIndex: 'contact_person', width: 140, search: false },
    { title: '手机号', dataIndex: 'contact_phone', width: 150, search: false },
    { title: '更新时间', dataIndex: 'updated_at', width: 170, search: false },
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
          title="确认删除该保险公司？"
          onConfirm={async () => {
            await deleteInsuranceCompany(row.id);
            message.success('删除成功');
            actionRef.current?.reload();
          }}
        >
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable
        headerTitle="保险公司管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, keyword } = params;
          const res = await getInsuranceCompanies({ page: current, pageSize, keyword });
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
            新增保险公司
          </Button>,
        ]}
        pagination={{ defaultPageSize: 10 }}
      />

      <ModalForm
        title={editingRow ? '编辑保险公司' : '新增保险公司'}
        open={modalVisit}
        onOpenChange={(open) => {
          setModalVisit(open);
          if (!open) setEditingRow(null);
        }}
        initialValues={editingRow || {}}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (editingRow) {
            await updateInsuranceCompany(editingRow.id, values);
            message.success('更新成功');
          } else {
            await createInsuranceCompany(values);
            message.success('创建成功');
          }
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]} width="md" />
        <ProFormText name="contact_person" label="联系人" width="md" />
        <ProFormText name="contact_phone" label="手机号" width="md" />
      </ModalForm>
    </>
  );
}
