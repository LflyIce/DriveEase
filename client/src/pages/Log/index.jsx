import React, { useRef } from 'react';
import { Tag } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import { getLogs } from '../../services/api';

const resultColor = { '成功': 'green', '失败': 'red' };

export default function LogPage() {
  const actionRef = useRef();

  const columns = [
    { title: '序号', dataIndex: 'id', width: 60, search: false },
    { title: '操作人', dataIndex: 'operator', width: 100 },
    { title: '操作类型', dataIndex: 'action', width: 120 },
    { title: '操作对象', dataIndex: 'target', width: 150, search: false },
    { title: '操作详情', dataIndex: 'detail', width: 200, search: false, ellipsis: true },
    {
      title: '操作结果',
      dataIndex: 'result',
      width: 90,
      valueType: 'select',
      valueEnum: {
        '成功': { text: '成功', status: 'Success' },
        '失败': { text: '失败', status: 'Error' },
      },
      render: (_, row) => <Tag color={resultColor[row.result]}>{row.result}</Tag>,
    },
    { title: '操作时间', dataIndex: 'created_at', width: 170, search: false },
  ];

  return (
    <ProTable
      headerTitle="操作日志"
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      search={{ labelWidth: 'auto' }}
      request={async (params) => {
        const { current, pageSize, operator, action } = params;
        const res = await getLogs({ page: current, pageSize, operator, action });
        return { data: res.data, total: res.total, success: true };
      }}
      pagination={{ defaultPageSize: 10 }}
      options={{ density: false, fullScreen: true, reload: true, setting: false }}
    />
  );
}
