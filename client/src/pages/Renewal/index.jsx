import React, { useRef, useState } from 'react';
import { Button, message, Tag, Space } from 'antd';
import {
  ProTable,
  ModalForm,
  ProFormSelect,
  ProFormDatePicker,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { getRenewals, getUpcomingRenewals, createRenewal, updateRenewal, executeRenewal, getPolicies } from '../../services/api';
import dayjs from 'dayjs';

const statusColors = {
  '待提醒': 'default',
  '已提醒': 'processing',
  '已续保': 'success',
  '已过期': 'error',
};

export default function RenewalPage() {
  const actionRef = useRef();
  const [renewVisit, setRenewVisit] = useState(false);
  const [renewingId, setRenewingId] = useState(null);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    {
      title: '原保单号',
      dataIndex: ['oldPolicy', 'policy_number'],
      width: 160,
      search: false,
    },
    {
      title: '投保人',
      dataIndex: ['oldPolicy', 'customer', 'name'],
      width: 100,
      search: false,
    },
    {
      title: '车辆',
      dataIndex: ['oldPolicy', 'vehicle', 'plate_number'],
      width: 120,
      search: false,
    },
    { title: '提醒日期', dataIndex: 'remind_date', width: 110, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        '待提醒': { text: '待提醒' },
        '已提醒': { text: '已提醒' },
        '已续保': { text: '已续保' },
        '已过期': { text: '已过期' },
      },
      render: (_, row) => <Tag color={statusColors[row.status]}>{row.status}</Tag>,
    },
    {
      title: '新保单号',
      dataIndex: ['newPolicy', 'policy_number'],
      width: 160,
      search: false,
      render: (v) => v || '-',
    },
    { title: '备注', dataIndex: 'note', width: 200, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, row) => [
        row.status === '待提醒' && (
          <Button
            key="remind"
            type="link"
            onClick={async () => {
              await updateRenewal(row.id, { status: '已提醒' });
              message.success('已标记为已提醒');
              actionRef.current?.reload();
            }}
          >
            标记已提醒
          </Button>
        ),
        (row.status === '待提醒' || row.status === '已提醒') && (
          <Button
            key="renew"
            type="link"
            onClick={() => {
              setRenewingId(row.id);
              setRenewVisit(true);
            }}
          >
            执行续保
          </Button>
        ),
      ],
    },
  ];

  return (
    <>
      <ProTable
        headerTitle="续保管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const { current, pageSize, status } = params;
          const res = await getRenewals({ page: current, pageSize, status });
          return { data: res.data, total: res.total, success: true };
        }}
        toolBarRender={() => [
          <Button
            key="upcoming"
            onClick={async () => {
              const data = await getUpcomingRenewals();
              message.info(`30天内即将到期：${data.length} 条`);
            }}
          >
            查看30天内到期
          </Button>,
        ]}
        pagination={{ defaultPageSize: 10 }}
      />

      <ModalForm
        title="执行续保"
        open={renewVisit}
        onOpenChange={setRenewVisit}
        onFinish={async (values) => {
          const data = {
            ...values,
            start_date: values.start_date?.format?.('YYYY-MM-DD'),
            end_date: values.end_date?.format?.('YYYY-MM-DD'),
          };
          await executeRenewal(renewingId, data);
          message.success('续保成功');
          actionRef.current?.reload();
          return true;
        }}
      >
        <ProFormSelect
          name="insurance_type"
          label="险种"
          options={[
            { label: '交强险', value: '交强险' },
            { label: '商业险', value: '商业险' },
            { label: '综合', value: '综合' },
          ]}
          width="md"
        />
        <ProFormTextArea name="remark" label="备注" width="md" />
      </ModalForm>
    </>
  );
}
