import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Checkbox, Empty, Form, Popconfirm, Space, Table, Tag, Typography, Upload, message, theme } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormGroup,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import dayjs from 'dayjs';
import {
  createCustomer,
  createPolicy,
  createVehicle,
  deletePolicy,
  getCommercialInsuranceTypes,
  getCompulsoryInsuranceTypes,
  getCustomers,
  getInsuranceCompanies,
  getPolicies,
  getUsers,
  getVehicles,
  updatePolicy,
  updatePolicyStatus,
} from '../../services/api';

const statusColors = {
  生效: 'green',
  待生效: 'blue',
  已过期: 'default',
  已退保: 'red',
};

const certificateTypeOptions = [
  { label: '身份证', value: '身份证' },
  { label: '统一社会信用代码', value: '统一社会信用代码' },
  { label: '护照', value: '护照' },
  { label: '其他', value: '其他' },
];

const statusOptions = [
  { label: '待生效', value: '待生效' },
  { label: '生效', value: '生效' },
  { label: '已过期', value: '已过期' },
  { label: '已退保', value: '已退保' },
];

function getDefaultPolicyValues() {
  const now = dayjs();
  return {
    issue_time: now.format('YYYY-MM-DD HH:mm:ss'),
    policy_date: now,
    policy_number: `POL-${now.format('YYYYMMDD-HHmmss')}`,
    status: '待生效',
    effective_date: now,
    expiry_date: now.add(1, 'year'),
    certificate_type: '身份证',
    compulsory_enabled: false,
    commercial_enabled: false,
    compulsory_items: [],
    commercial_items: [],
  };
}

function parseDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return '-';
  return `¥${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '-';
  return value?.format?.('YYYY-MM-DD') || value;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function PolicyHeader({ mode }) {
  const { token } = theme.useToken();
  const isCreate = mode === 'create';

  return (
    <Card
      bordered={false}
      styles={{ body: { padding: '18px 24px' } }}
      style={{ marginBottom: 16, borderRadius: token.borderRadiusLG }}
    >
      <Space direction="vertical" size={2}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {isCreate ? '新增保单' : '查保单'}
        </Typography.Title>
        <Typography.Text type="secondary">
          {isCreate ? '按业务单据流程录入投保人、车辆、保障期间与金额。' : '按保单号与状态查询保单，并处理编辑、激活、删除。'}
        </Typography.Text>
      </Space>
    </Card>
  );
}

function PolicySection({ title, children }) {
  const { token } = theme.useToken();

  return (
    <div style={{ padding: '18px 0 6px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          fontSize: 15,
          fontWeight: 600,
          color: token.colorText,
        }}
      >
        <span style={{ width: 3, height: 15, borderRadius: 2, background: token.colorPrimary }} />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PolicyUploadField({ name }) {
  const form = Form.useFormInstance();
  const fileList = Form.useWatch(name, form) || [];

  return (
    <Upload
      accept="image/*"
      listType="picture-card"
      fileList={fileList}
      beforeUpload={async (file) => {
        if (fileList.length >= 10) {
          message.warning('最多上传 10 张保单图片');
          return Upload.LIST_IGNORE;
        }
        const url = await fileToBase64(file);
        form.setFieldValue(name, [
          ...fileList,
          {
            uid: file.uid,
            name: file.name,
            status: 'done',
            url,
          },
        ]);
        return Upload.LIST_IGNORE;
      }}
      onRemove={(file) => {
        form.setFieldValue(
          name,
          fileList.filter((item) => item.uid !== file.uid)
        );
      }}
    >
      {fileList.length >= 10 ? null : (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>上传</div>
        </div>
      )}
    </Upload>
  );
}

function MoneyCell({ name, disabled }) {
  return (
    <ProFormDigit
      name={name}
      label={false}
      fieldProps={{ precision: 2, min: 0, disabled, style: { width: '100%' } }}
    />
  );
}

function InsuranceTitle({ name, title }) {
  return (
    <Form.Item name={name} valuePropName="checked" noStyle>
      <Checkbox>
        <Typography.Text strong>{title}</Typography.Text>
      </Checkbox>
    </Form.Item>
  );
}

function InsuranceSelectCell({ listName, fieldName, options, disabled }) {
  const form = Form.useFormInstance();
  const rows = Form.useWatch(listName, form) || [];
  const currentValue = rows[fieldName]?.type_id;
  const selectableOptions = options.map((option) => {
    const duplicate = rows.some((row, index) => index !== fieldName && String(row?.type_id) === String(option.value));
    return { ...option, disabled: duplicate };
  });

  return (
    <>
      <ProFormSelect
        name={[fieldName, 'type_id']}
        label={false}
        options={selectableOptions}
        rules={[{ required: true, message: '请选择保险' }]}
        fieldProps={{
          showSearch: true,
          optionFilterProp: 'label',
          disabled,
          onChange: (_, option) => {
            const duplicated = rows.some((row, index) => index !== fieldName && String(row?.type_id) === String(option?.value));
            if (duplicated) {
              message.warning('不能重复添加相同保险');
              form.setFieldValue([listName, fieldName, 'type_id'], currentValue);
              return;
            }
            form.setFieldValue([listName, fieldName, 'name'], option?.label || '');
          },
        }}
      />
      <ProFormText name={[fieldName, 'name']} hidden />
    </>
  );
}

function normalizeLegacyCompulsoryRow(parsed, prefix, name) {
  const hasValue = Object.keys(parsed).some((key) => key.startsWith(prefix) && parsed[key] !== undefined && parsed[key] !== null && parsed[key] !== '');
  if (!hasValue) return null;
  return {
    type_id: name,
    name,
    premium: parsed[`${prefix}_premium`],
    discount_amount: parsed[`${prefix}_discount_amount`],
    discount: parsed[`${prefix}_discount`],
    actual: parsed[`${prefix}_actual`],
    return_points: parsed[`${prefix}_return_points`],
    return_amount: parsed[`${prefix}_return_amount`],
    remark: parsed[`${prefix}_remark`],
  };
}

function normalizeCompulsoryDetail(detail) {
  const parsed = parseDetail(detail);
  if (Array.isArray(parsed.rows)) {
    return {
      compulsory_enabled: parsed.compulsory_enabled ?? parsed.rows.length > 0,
      compulsory_policy_number: parsed.compulsory_policy_number,
      compulsory_images: parsed.compulsory_images,
      compulsory_items: parsed.rows,
    };
  }

  const legacyRows = [
    normalizeLegacyCompulsoryRow(parsed, 'compulsory_traffic', '交强险'),
    normalizeLegacyCompulsoryRow(parsed, 'compulsory_tax', '代收车船税'),
  ].filter(Boolean);

  return {
    compulsory_enabled: parsed.compulsory_enabled ?? legacyRows.length > 0,
    compulsory_policy_number: parsed.compulsory_policy_number,
    compulsory_images: parsed.compulsory_images,
    compulsory_items: legacyRows,
  };
}

function normalizeCommercialDetail(detail) {
  const parsed = parseDetail(detail);
  if (!Array.isArray(parsed.rows)) {
    return {
      commercial_enabled: parsed.commercial_enabled ?? false,
      commercial_policy_number: parsed.commercial_policy_number,
      commercial_images: parsed.commercial_images,
      commercial_items: [],
    };
  }

  return {
    commercial_enabled: parsed.commercial_enabled ?? parsed.rows.length > 0,
    commercial_policy_number: parsed.commercial_policy_number,
    commercial_images: parsed.commercial_images,
    commercial_items: parsed.rows,
  };
}

function normalizeSubmitRows(rows = []) {
  return rows
    .filter((row) => row?.type_id || row?.name)
    .map((row) => ({
      type_id: row.type_id || null,
      name: row.name || '',
      sum_insured: Number(row.sum_insured || 0),
      premium: Number(row.premium || 0),
      discount_amount: Number(row.discount_amount || 0),
      discount: Number(row.discount || 0),
      actual: Number(row.actual || 0),
      return_points: Number(row.return_points || 0),
      return_amount: Number(row.return_amount || 0),
      remark: row.remark || '',
    }));
}

function hasDuplicateInsurance(rows) {
  const seen = new Set();
  return rows.some((row) => {
    const key = String(row.type_id || row.name || '');
    if (!key) return false;
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

function sumInsuranceRows(rows = []) {
  return rows.reduce(
    (sum, row) => ({
      premium: sum.premium + Number(row?.premium || 0),
      discountAmount: sum.discountAmount + Number(row?.discount_amount || 0),
      actual: sum.actual + Number(row?.actual || 0),
      returnAmount: sum.returnAmount + Number(row?.return_amount || 0),
    }),
    { premium: 0, discountAmount: 0, actual: 0, returnAmount: 0 }
  );
}

function SummaryLine({ label, value, detail, onValueClick, expandable }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
      <Typography.Text strong>{label}：</Typography.Text>
      <Typography.Text
        strong
        onClick={onValueClick}
        style={{
          color: '#fa541c',
          fontSize: 16,
          cursor: onValueClick ? 'pointer' : 'default',
          userSelect: onValueClick ? 'none' : undefined,
        }}
      >
        {formatMoney(value)}
        {expandable ? ' ^' : ''}
      </Typography.Text>
      {detail && <Typography.Text type="secondary">{detail}</Typography.Text>}
    </div>
  );
}

function PremiumSummaryBar() {
  const [expanded, setExpanded] = useState(false);
  const form = Form.useFormInstance();
  const { token } = theme.useToken();
  const compulsoryEnabled = Form.useWatch('compulsory_enabled', form);
  const commercialEnabled = Form.useWatch('commercial_enabled', form);
  const watchedCompulsoryRows = Form.useWatch('compulsory_items', form) || [];
  const watchedCommercialRows = Form.useWatch('commercial_items', form) || [];
  const compulsoryRows = compulsoryEnabled ? watchedCompulsoryRows : [];
  const commercialRows = commercialEnabled ? watchedCommercialRows : [];
  const compulsory = sumInsuranceRows(compulsoryRows);
  const commercial = sumInsuranceRows(commercialRows);
  const totalPremium = compulsory.premium + commercial.premium;
  const totalDiscount = compulsory.discountAmount + commercial.discountAmount;
  const totalReturn = compulsory.returnAmount + commercial.returnAmount;
  const totalActual = compulsory.actual + commercial.actual;

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 8,
        marginTop: 18,
        marginBottom: 12,
        padding: '14px 16px',
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        boxShadow: '0 -6px 18px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {expanded && (
          <>
            <SummaryLine
              label="保费总计"
              value={totalPremium}
              detail={`= 交强险小计：${formatMoney(compulsory.premium)} + 商业险小计：${formatMoney(commercial.premium)}`}
            />
            <SummaryLine
              label="车主优惠"
              value={totalDiscount}
              detail={`= 交强险折扣：${formatMoney(compulsory.discountAmount)} + 商业险折扣：${formatMoney(commercial.discountAmount)}`}
            />
            <SummaryLine label="保险公司返利" value={totalReturn} />
          </>
        )}
        <div style={expanded ? { marginTop: 6, paddingTop: 10, borderTop: `1px solid ${token.colorBorderSecondary}` } : undefined}>
          <SummaryLine
            label="实收总计"
            value={totalActual}
            onValueClick={() => setExpanded((value) => !value)}
            expandable
          />
        </div>
      </Space>
    </div>
  );
}

function InsuranceRowsTable({ listName, options, addText, emptyText, withSumInsured, disabled }) {
  const form = Form.useFormInstance();
  const { token } = theme.useToken();
  const watchedRows = Form.useWatch(listName, form) || [];

  return (
    <Form.List name={listName}>
      {(fields, { add, remove }) => {
        const rows = watchedRows;
        const premiumTotal = rows.reduce((sum, row) => sum + Number(row?.premium || 0), 0);
        const actualTotal = rows.reduce((sum, row) => sum + Number(row?.actual || 0), 0);
        const selectedValues = new Set(rows.map((row) => row?.type_id).filter(Boolean).map(String));
        const availableOption = options.find((option) => !selectedValues.has(String(option.value)));
        const handleAdd = () => {
          if (disabled) {
            message.warning('请先勾选使用该保险类型');
            return;
          }
          if (!availableOption) {
            message.warning('没有可添加的保险，不能重复添加相同保险');
            return;
          }
          add({ type_id: availableOption.value, name: availableOption.label, discount: 100 });
        };
        const columns = [
          {
            title: '保险名称',
            width: 190,
            render: (_, field) => <InsuranceSelectCell listName={listName} fieldName={field.name} options={options} disabled={disabled} />,
          },
          ...(withSumInsured ? [{ title: '保额', width: 130, render: (_, field) => <MoneyCell name={[field.name, 'sum_insured']} disabled={disabled} /> }] : []),
          { title: '保费', width: 130, render: (_, field) => <MoneyCell name={[field.name, 'premium']} disabled={disabled} /> },
          { title: '车主优惠', width: 130, render: (_, field) => <MoneyCell name={[field.name, 'discount_amount']} disabled={disabled} /> },
          { title: '车主折扣%', width: 130, render: (_, field) => <MoneyCell name={[field.name, 'discount']} disabled={disabled} /> },
          { title: '实收金额', width: 130, render: (_, field) => <MoneyCell name={[field.name, 'actual']} disabled={disabled} /> },
          { title: '保险公司返点%', width: 150, render: (_, field) => <MoneyCell name={[field.name, 'return_points']} disabled={disabled} /> },
          { title: '保险公司返利', width: 150, render: (_, field) => <MoneyCell name={[field.name, 'return_amount']} disabled={disabled} /> },
          { title: '备注', width: 180, render: (_, field) => <ProFormText name={[field.name, 'remark']} label={false} fieldProps={{ disabled }} /> },
          {
            title: '操作',
            width: 80,
            fixed: 'right',
            render: (_, field) => (
              <Button type="text" danger icon={<DeleteOutlined />} disabled={disabled} onClick={() => remove(field.name)} />
            ),
          },
        ];

        return (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Table
              size="small"
              bordered
              pagination={false}
              dataSource={fields}
              rowKey="key"
              scroll={{ x: withSumInsured ? 1450 : 1320 }}
              style={{ background: token.colorBgContainer }}
              columns={columns}
              locale={{ emptyText }}
              footer={() => (
                <Button type="dashed" icon={<PlusOutlined />} disabled={disabled} onClick={handleAdd}>
                  {addText}
                </Button>
              )}
            />
            <Typography.Text type="secondary">
              保费合计：{formatMoney(premiumTotal)}，实收合计：{formatMoney(actualTotal)}
            </Typography.Text>
          </Space>
        );
      }}
    </Form.List>
  );
}

function InsuranceTables({ compulsoryTypes, commercialTypes }) {
  const form = Form.useFormInstance();
  const compulsoryEnabled = Form.useWatch('compulsory_enabled', form);
  const commercialEnabled = Form.useWatch('commercial_enabled', form);
  const compulsoryOptions = compulsoryTypes.map((item) => ({ label: item.name, value: item.id }));
  const commercialOptions = commercialTypes.map((item) => ({ label: item.name, value: item.id }));

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small" title={<InsuranceTitle name="compulsory_enabled" title="交强险" />} styles={{ body: { padding: 12 } }}>
        <ProFormText name="compulsory_policy_number" label="保单号" width="md" />
        <InsuranceRowsTable
          listName="compulsory_items"
          options={compulsoryOptions}
          addText="添加交强险"
          emptyText="点击添加交强险后选择保险名称"
          disabled={!compulsoryEnabled}
        />
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>保单上传（10张内）</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <PolicyUploadField name="compulsory_images" />
          </div>
        </div>
      </Card>

      <Card size="small" title={<InsuranceTitle name="commercial_enabled" title="商业险" />} styles={{ body: { padding: 12 } }}>
        <ProFormText name="commercial_policy_number" label="保单号" width="md" />
        <InsuranceRowsTable
          listName="commercial_items"
          options={commercialOptions}
          addText="添加商业险"
          emptyText="点击添加商业险后选择保险名称"
          withSumInsured
          disabled={!commercialEnabled}
        />
        <div style={{ marginTop: 16 }}>
          <Typography.Text strong>保单上传（10张内）</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <PolicyUploadField name="commercial_images" />
          </div>
        </div>
      </Card>
    </Space>
  );
}

function PolicyFormFields({
  form,
  customers,
  vehicles,
  customerOptions,
  vehicleOptions,
  editingRow,
  canQuickCreate,
  onAddCustomer,
  onAddVehicle,
  compulsoryTypes,
  commercialTypes,
  insuranceCompanies,
  insuranceCompanyOptions,
  userOptions,
}) {
  const watchedCustomerId = Form.useWatch('customer_id', form);
  const { token } = theme.useToken();

  const filteredVehicleOptions = useMemo(() => {
    if (!watchedCustomerId) return vehicleOptions;
    return vehicleOptions.filter((vehicle) => vehicle.customerId === watchedCustomerId);
  }, [vehicleOptions, watchedCustomerId]);

  return (
    <>
      <PolicySection title="基础信息">
        <ProFormGroup>
          <ProFormText name="issue_time" label="开单时间" disabled width="md" />
          <ProFormText name="policy_number" label="保单号" disabled rules={[{ required: true, message: '请输入保单号' }]} width="md" />
          <ProFormSelect
            name="status"
            label="保单状态"
            options={statusOptions}
            width="sm"
            disabled={!editingRow}
            tooltip={!editingRow ? '新建保单默认待生效，可在查单页面激活' : undefined}
          />
        </ProFormGroup>
      </PolicySection>

      <PolicySection title="投保人与车辆信息">
        <ProFormGroup>
          <ProFormSelect
            name="customer_id"
            label={
              <Space size={8}>
                <span>投保人</span>
                {canQuickCreate && (
                  <Button size="small" type="link" onClick={onAddCustomer} style={{ paddingInline: 0 }}>
                    新增
                  </Button>
                )}
              </Space>
            }
            placeholder="请选择投保人"
            rules={[{ required: true, message: '请选择投保人' }]}
            options={customerOptions}
            fieldProps={{
              showSearch: true,
              optionFilterProp: 'label',
              onChange: (value) => {
                const customer = customers.find((item) => item.id === value);
                form.setFieldValue('customer_phone', customer?.phone || '');
                form.setFieldValue('vehicle_id', undefined);
              },
            }}
            width="md"
          />
          <ProFormText name="customer_phone" label="投保人手机号" disabled width="sm" />
          <ProFormSelect name="certificate_type" label="证件类型" options={certificateTypeOptions} width="sm" />
          <ProFormText name="certificate_number" label="证件号码" width="md" />
          <ProFormSelect
            name="vehicle_id"
            label={
              <Space size={8}>
                <span>被保车辆</span>
                {canQuickCreate && (
                  <Button size="small" type="link" onClick={onAddVehicle} style={{ paddingInline: 0 }}>
                    新增
                  </Button>
                )}
              </Space>
            }
            placeholder="请选择车辆"
            rules={[{ required: true, message: '请选择被保车辆' }]}
            options={filteredVehicleOptions}
            fieldProps={{
              showSearch: true,
              optionFilterProp: 'label',
              notFoundContent: watchedCustomerId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该投保人暂无车辆" /> : null,
              onChange: (value) => {
                const vehicle = vehicles.find((item) => item.id === value);
                if (vehicle?.customer_id && form.getFieldValue('customer_id') !== vehicle.customer_id) {
                  const customer = customers.find((item) => item.id === vehicle.customer_id);
                  form.setFieldsValue({ customer_id: vehicle.customer_id, customer_phone: customer?.phone || '' });
                }
              },
            }}
            width="md"
          />
        </ProFormGroup>
      </PolicySection>

      <PolicySection title="保障与金额">
        <ProFormGroup>
          <ProFormDatePicker
            name="policy_date"
            label="保单日期"
            rules={[{ required: true, message: '请选择保单日期' }]}
            width="sm"
          />
          <ProFormDatePicker
            name="effective_date"
            label="保险生效日期"
            rules={[{ required: true, message: '请选择保险生效日期' }]}
            width="sm"
          />
          <ProFormDatePicker
            name="expiry_date"
            label="保险到期日期"
            rules={[{ required: true, message: '请选择保险到期日期' }]}
            width="sm"
          />
          <ProFormSelect
            name="insurance_company"
            label="保险公司"
            options={insuranceCompanyOptions}
            width="md"
            fieldProps={{
              showSearch: true,
              optionFilterProp: 'label',
              onChange: (value) => {
                const company = insuranceCompanies.find((item) => item.name === value);
                form.setFieldsValue({
                  contact_person: company?.contact_person || '',
                  contact_phone: company?.contact_phone || '',
                });
              },
            }}
          />
          <ProFormText name="contact_person" label="联系人" width="sm" />
          <ProFormText name="contact_phone" label="手机号" width="sm" />
          <ProFormSelect
            name="sales_person"
            label="销售人员"
            options={userOptions}
            width="sm"
            fieldProps={{ showSearch: true, optionFilterProp: 'label' }}
          />
        </ProFormGroup>
      </PolicySection>

      <PolicySection title="保费明细预览">
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            background: token.colorFillAlter,
          }}
        >
          <InsuranceTables compulsoryTypes={compulsoryTypes} commercialTypes={commercialTypes} />
        </div>
      </PolicySection>

      <PolicySection title="备注">
        <ProFormTextArea
          name="remark"
          label={false}
          placeholder="可填写特别约定、客户说明或内部备注"
          fieldProps={{ rows: 3, maxLength: 200, showCount: true }}
        />
      </PolicySection>

      <PremiumSummaryBar />
    </>
  );
}

export default function PolicyPage({ mode = 'create' }) {
  const actionRef = useRef();
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [customerForm] = Form.useForm();
  const [vehicleForm] = Form.useForm();
  const [modalVisit, setModalVisit] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [compulsoryTypes, setCompulsoryTypes] = useState([]);
  const [commercialTypes, setCommercialTypes] = useState([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [insuranceCompanyOptions, setInsuranceCompanyOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const { token } = theme.useToken();

  const loadRelations = async () => {
    const [customerRes, vehicleRes, compulsoryTypeRes, commercialTypeRes, insuranceCompanyRes, userRes] = await Promise.all([
      getCustomers({ page: 1, pageSize: 1000 }),
      getVehicles({ page: 1, pageSize: 1000 }),
      getCompulsoryInsuranceTypes({ page: 1, pageSize: 1000 }),
      getCommercialInsuranceTypes({ page: 1, pageSize: 1000 }),
      getInsuranceCompanies({ page: 1, pageSize: 1000 }),
      getUsers({ page: 1, pageSize: 1000, status: '启用' }),
    ]);
    const nextCustomers = customerRes.data || [];
    const nextVehicles = vehicleRes.data || [];
    const nextCompulsoryTypes = compulsoryTypeRes.data || [];
    const nextCommercialTypes = commercialTypeRes.data || [];
    const nextInsuranceCompanies = insuranceCompanyRes.data || [];
    const nextUsers = userRes.data || [];

    setCustomers(nextCustomers);
    setVehicles(nextVehicles);
    setCompulsoryTypes(nextCompulsoryTypes);
    setCommercialTypes(nextCommercialTypes);
    setInsuranceCompanies(nextInsuranceCompanies);
    setCustomerOptions(
      nextCustomers.map((customer) => ({
        label: `${customer.name} (${customer.phone})`,
        value: customer.id,
      }))
    );
    setVehicleOptions(
      nextVehicles.map((vehicle) => ({
        label: `${vehicle.plate_number} - ${vehicle.brand} ${vehicle.model}`,
        value: vehicle.id,
        customerId: vehicle.customer_id,
      }))
    );
    setInsuranceCompanyOptions(
      nextInsuranceCompanies.map((company) => ({
        label: company.name,
        value: company.name,
      }))
    );
    setUserOptions(
      nextUsers.map((user) => ({
        label: user.username,
        value: user.username,
      }))
    );
    return {
      customers: nextCustomers,
      vehicles: nextVehicles,
      compulsoryTypes: nextCompulsoryTypes,
      commercialTypes: nextCommercialTypes,
      insuranceCompanies: nextInsuranceCompanies,
      users: nextUsers,
    };
  };

  useEffect(() => {
    loadRelations();
  }, []);

  useEffect(() => {
    if (mode === 'create') {
      createForm.resetFields();
      createForm.setFieldsValue(getDefaultPolicyValues());
    }
  }, [createForm, mode]);

  const handleOpenEditForm = (row) => {
    const compulsoryDetail = normalizeCompulsoryDetail(row.compulsory_detail);
    const commercialDetail = normalizeCommercialDetail(row.commercial_detail);
    setEditingRow(row);
    setModalVisit(true);
    editForm.setFieldsValue({
      ...row,
      ...compulsoryDetail,
      ...commercialDetail,
      issue_time: row.issue_time || row.created_at || dayjs().format('YYYY-MM-DD HH:mm:ss'),
      policy_date: row.policy_date || row.effective_date || row.start_date ? dayjs(row.policy_date || row.effective_date || row.start_date) : dayjs(),
      certificate_type: row.certificate_type || '身份证',
      customer_phone: row.customer?.phone || row.customer_phone || '',
      effective_date: row.effective_date || row.start_date ? dayjs(row.effective_date || row.start_date) : undefined,
      expiry_date: row.expiry_date || row.end_date ? dayjs(row.expiry_date || row.end_date) : undefined,
    });
  };

  const submitPolicy = async (values, row) => {
    const selectedCompulsoryRows = values.compulsory_enabled ? normalizeSubmitRows(values.compulsory_items) : [];
    const selectedCommercialRows = values.commercial_enabled ? normalizeSubmitRows(values.commercial_items) : [];

    if (!values.compulsory_enabled && !values.commercial_enabled) {
      message.warning('请至少勾选一个保险类型');
      return false;
    }
    if (values.compulsory_enabled && selectedCompulsoryRows.length === 0) {
      message.warning('请在交强险表格中添加保险');
      return false;
    }
    if (values.commercial_enabled && selectedCommercialRows.length === 0) {
      message.warning('请在商业险表格中添加保险');
      return false;
    }
    if (hasDuplicateInsurance(selectedCompulsoryRows) || hasDuplicateInsurance(selectedCommercialRows)) {
      message.warning('不能重复添加相同保险');
      return false;
    }

    const hasCompulsory = selectedCompulsoryRows.length > 0;
    const hasCommercial = selectedCommercialRows.length > 0;
    const compulsoryPremium = selectedCompulsoryRows.reduce((sum, item) => sum + item.premium, 0);
    const commercialPremium = selectedCommercialRows.reduce((sum, row) => sum + row.premium, 0);
    const commercialSumInsured = selectedCommercialRows.reduce((sum, row) => sum + row.sum_insured, 0);
    const premium = compulsoryPremium + commercialPremium;
    const sumInsured = hasCommercial ? commercialSumInsured : 200000;
    const insuranceType =
      hasCompulsory && hasCommercial
        ? '综合'
        : hasCompulsory
          ? '交强险'
          : '商业险';
    const data = {
      ...values,
      insurance_type: insuranceType,
      premium,
      sum_insured: sumInsured,
      compulsory_detail: {
        compulsory_enabled: hasCompulsory,
        compulsory_policy_number: values.compulsory_policy_number,
        compulsory_images: values.compulsory_images,
        rows: selectedCompulsoryRows,
      },
      commercial_detail: {
        commercial_enabled: hasCommercial,
        commercial_policy_number: values.commercial_policy_number,
        commercial_images: values.commercial_images,
        rows: selectedCommercialRows,
      },
      policy_date: values.policy_date?.format?.('YYYY-MM-DD') || values.policy_date,
      effective_date: values.effective_date?.format?.('YYYY-MM-DD') || values.effective_date,
      expiry_date: values.expiry_date?.format?.('YYYY-MM-DD') || values.expiry_date,
      start_date: values.effective_date?.format?.('YYYY-MM-DD') || values.effective_date,
      end_date: values.expiry_date?.format?.('YYYY-MM-DD') || values.expiry_date,
    };
    delete data.customer_phone;
    delete data.compulsory_items;
    delete data.commercial_items;
    delete data.compulsory_policy_number;
    delete data.compulsory_images;
    delete data.commercial_policy_number;
    delete data.commercial_images;

    if (row) {
      await updatePolicy(row.id, data);
      message.success('更新成功');
      actionRef.current?.reload();
      setModalVisit(false);
      return true;
    }

    await createPolicy(data);
    message.success('创建成功');
    createForm.resetFields();
    createForm.setFieldsValue(getDefaultPolicyValues());
    return true;
  };

  const handleCreateCustomer = async (values) => {
    const customer = await createCustomer(values);
    await loadRelations();
    createForm.setFieldsValue({ customer_id: customer.id, customer_phone: customer.phone, vehicle_id: undefined });
    message.success('投保人已新增');
    return true;
  };

  const handleCreateVehicle = async (values) => {
    const customerId = createForm.getFieldValue('customer_id');
    if (!customerId) {
      message.warning('请先选择或新增投保人');
      return false;
    }
    const vehicle = await createVehicle({ ...values, customer_id: customerId });
    await loadRelations();
    createForm.setFieldValue('vehicle_id', vehicle.id);
    message.success('车辆已新增');
    return true;
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    { title: '保单号', dataIndex: 'policy_number', width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        生效: { text: '生效', status: 'Success' },
        待生效: { text: '待生效', status: 'Processing' },
        已过期: { text: '已过期', status: 'Default' },
        已退保: { text: '已退保', status: 'Error' },
      },
      render: (_, row) => <Tag color={statusColors[row.status]}>{row.status}</Tag>,
    },
    {
      title: '投保人',
      dataIndex: ['customer', 'name'],
      width: 100,
      search: false,
    },
    {
      title: '车辆',
      dataIndex: ['vehicle', 'plate_number'],
      width: 120,
      search: false,
    },
    { title: '保险公司', dataIndex: 'insurance_company', width: 140, search: false, render: (_, row) => row.insurance_company || '-' },
    { title: '险种', dataIndex: 'insurance_type', width: 90, search: false },
    {
      title: '保费',
      dataIndex: 'premium',
      width: 110,
      search: false,
      render: (_, row) => formatMoney(row.premium),
    },
    { title: '生效日期', dataIndex: 'effective_date', width: 110, search: false, render: (_, row) => row.effective_date || row.start_date },
    { title: '到期日期', dataIndex: 'expiry_date', width: 110, search: false, render: (_, row) => row.expiry_date || row.end_date },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, row) => [
        <Button key="edit" type="link" onClick={() => handleOpenEditForm(row)}>
          编辑
        </Button>,
        row.status === '待生效' && (
          <Button
            key="activate"
            type="link"
            onClick={async () => {
              await updatePolicyStatus(row.id, '生效');
              message.success('保单已激活');
              actionRef.current?.reload();
            }}
          >
            激活
          </Button>
        ),
        <Popconfirm
          key="del"
          title="确认删除该保单？"
          onConfirm={async () => {
            await deletePolicy(row.id);
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

  const formProps = {
    customers,
    vehicles,
    compulsoryTypes,
    commercialTypes,
    insuranceCompanies,
    customerOptions,
    vehicleOptions,
    insuranceCompanyOptions,
    userOptions,
  };

  return (
    <>
      {mode === 'query' ? (
        <>
          <PolicyHeader mode="query" />
          <ProTable
            headerTitle="保单查询"
            actionRef={actionRef}
            rowKey="id"
            columns={columns}
            search={{ labelWidth: 'auto' }}
            request={async (params) => {
              const { current, pageSize, keyword, status } = params;
              const res = await getPolicies({ page: current, pageSize, keyword, status });
              return { data: res.data, total: res.total, success: true };
            }}
            options={{ density: true, fullScreen: true, reload: true, setting: false }}
            pagination={{ defaultPageSize: 10 }}
          />

          <ModalForm
            form={editForm}
            title="编辑保单"
            open={modalVisit}
            layout="vertical"
            width={1080}
            modalProps={{
              destroyOnClose: true,
              maskClosable: false,
              styles: { body: { paddingTop: 8 } },
            }}
            submitter={{
              searchConfig: {
                submitText: '保存修改',
                resetText: '取消',
              },
            }}
            onOpenChange={(open) => {
              setModalVisit(open);
              if (!open) {
                setEditingRow(null);
                editForm.resetFields();
              }
            }}
            onFinish={(values) => submitPolicy(values, editingRow)}
          >
            <PolicyFormFields form={editForm} editingRow={editingRow} canQuickCreate={false} {...formProps} />
          </ModalForm>
        </>
      ) : (
        <>
          <PolicyHeader mode="create" />
          <Card bordered={false} style={{ borderRadius: token.borderRadiusLG }}>
            <ProForm
              form={createForm}
              layout="vertical"
              submitter={{
                searchConfig: {
                  submitText: '提交保单',
                  resetText: '重置',
                },
                resetButtonProps: {
                  onClick: () => {
                    createForm.resetFields();
                    createForm.setFieldsValue(getDefaultPolicyValues());
                  },
                },
              }}
              onFinish={(values) => submitPolicy(values)}
            >
              <PolicyFormFields
                form={createForm}
                editingRow={null}
                canQuickCreate
                onAddCustomer={() => setCustomerModalOpen(true)}
                onAddVehicle={() => {
                  const customerId = createForm.getFieldValue('customer_id');
                  if (!customerId) {
                    message.warning('请先选择或新增投保人');
                    return;
                  }
                  vehicleForm.setFieldsValue({ customer_id: customerId });
                  setVehicleModalOpen(true);
                }}
                {...formProps}
              />
            </ProForm>
          </Card>
        </>
      )}

      <ModalForm
        form={customerForm}
        title="新增投保人"
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        modalProps={{ destroyOnClose: true }}
        width={520}
        onFinish={handleCreateCustomer}
      >
        <ProFormText name="name" label="投保人" rules={[{ required: true, message: '请输入投保人' }]} />
        <ProFormText name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]} />
        <ProFormText name="id_number" label="证件号码" />
        <ProFormText name="email" label="邮箱" />
        <ProFormTextArea name="address" label="地址" />
      </ModalForm>

      <ModalForm
        form={vehicleForm}
        title="新增车辆"
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        modalProps={{ destroyOnClose: true }}
        width={560}
        onFinish={handleCreateVehicle}
      >
        <ProFormText name="plate_number" label="车牌号" rules={[{ required: true, message: '请输入车牌号' }]} />
        <ProFormText name="brand" label="品牌" rules={[{ required: true, message: '请输入品牌' }]} />
        <ProFormText name="model" label="型号" rules={[{ required: true, message: '请输入型号' }]} />
        <ProFormDigit name="year" label="年份" fieldProps={{ precision: 0, min: 1900 }} />
        <ProFormText name="vin" label="车架号" />
        <ProFormText name="engine_number" label="发动机号" />
      </ModalForm>
    </>
  );
}
