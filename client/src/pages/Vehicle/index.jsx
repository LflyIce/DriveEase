import React, { useRef, useEffect, useState } from 'react';
import { Button, message, Popconfirm, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { ProTable, ModalForm, ProFormText, ProFormDigit, ProFormSelect } from '@ant-design/pro-components';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, getCustomers } from '../../services/api';

export default function VehiclePage() {
  const actionRef = useRef();
  const [modalVisit, setModalVisit] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [customerOptions, setCustomerOptions] = useState([]);

  useEffect(() => {
    getCustomers({ page: 1, pageSize: 1000 }).then((res) => {
      setCustomerOptions(res.data.map((c) => ({ label: `${c.name} (${c.phone})`, value: c.id })));
    });
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '车牌号', dataIndex: 'plate_number', width: 120 },
    { title: '品牌', dataIndex: 'brand', width: 100, search: false },
    { title: '型号', dataIndex: 'model', width: 100, search: false },
    { title: '年份', dataIndex: 'year', width: 80, search: false },
    { title: '车架号', dataIndex: 'vin', width: 180, search: false, ellipsis: true },
    { title: '发动机号', dataIndex: 'engine_number', width: 140, search: false },
    {
      title: '车主',
      dataIndex: ['customer', 'name'],
      width: 100,
      search: false,
    },
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
          title="确认删除该车辆？"
          onConfirm={async () => {
            await deleteVehicle(row.id);
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
        headerTitle="车辆管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, keyword } = params;
          const res = await getVehicles({ page: current, pageSize, keyword });
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
            新建车辆
          </Button>,
        ]}
        pagination={{ defaultPageSize: 10 }}
      />

      <ModalForm
        title={editingRow ? '编辑车辆' : '新建车辆'}
        open={modalVisit}
        onOpenChange={setModalVisit}
        initialValues={editingRow || {}}
        onFinish={async (values) => {
          if (editingRow) {
            await updateVehicle(editingRow.id, values);
            message.success('更新成功');
          } else {
            await createVehicle(values);
            message.success('创建成功');
          }
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormSelect
          name="customer_id"
          label="车主"
          rules={[{ required: true }]}
          options={customerOptions}
          fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          width="md"
        />
        <ProFormText name="plate_number" label="车牌号" rules={[{ required: true }]} width="md" />
        <ProFormText name="brand" label="品牌" rules={[{ required: true }]} width="md" />
        <ProFormText name="model" label="型号" rules={[{ required: true }]} width="md" />
        <ProFormDigit name="year" label="年份" width="sm" />
        <ProFormText name="vin" label="车架号" width="md" />
        <ProFormText name="engine_number" label="发动机号" width="md" />
      </ModalForm>
    </>
  );
}
