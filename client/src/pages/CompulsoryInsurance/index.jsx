import React, { useRef, useState } from 'react';
import { Button, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ModalForm, ProFormCheckbox, ProFormText, ProTable } from '@ant-design/pro-components';
import {
  createCompulsoryInsuranceType,
  deleteCompulsoryInsuranceType,
  getCompulsoryInsuranceTypes,
  updateCompulsoryInsuranceType,
} from '../../services/api';

export default function CompulsoryInsurancePage() {
  const actionRef = useRef();
  const [modalVisit, setModalVisit] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const columns = [
    { title: '序号', dataIndex: 'id', width: 70, search: false },
    { title: '保险名称', dataIndex: 'name', width: 220 },
    { title: '常用', dataIndex: 'is_common', width: 90, search: false, render: (_, row) => (row.is_common ? '是' : '否') },
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
          title="确认删除该交强险？"
          onConfirm={async () => {
            await deleteCompulsoryInsuranceType(row.id);
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
        headerTitle="交强险管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, keyword } = params;
          const res = await getCompulsoryInsuranceTypes({ page: current, pageSize, keyword });
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
            新增交强险
          </Button>,
        ]}
        pagination={{ defaultPageSize: 10 }}
      />

      <ModalForm
        title={editingRow ? '编辑交强险' : '新增交强险'}
        open={modalVisit}
        onOpenChange={(open) => {
          setModalVisit(open);
          if (!open) setEditingRow(null);
        }}
        initialValues={{ ...(editingRow || {}), is_common: Boolean(editingRow?.is_common) }}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          if (editingRow) {
            await updateCompulsoryInsuranceType(editingRow.id, values);
            message.success('更新成功');
          } else {
            await createCompulsoryInsuranceType(values);
            message.success('创建成功');
          }
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormText name="name" label="保险名称" rules={[{ required: true, message: '请输入保险名称' }]} width="md" />
        <ProFormCheckbox name="is_common">设为常用，开保单时默认显示</ProFormCheckbox>
      </ModalForm>
    </>
  );
}
