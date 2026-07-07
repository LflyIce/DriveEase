import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ModalForm, ProFormText } from '@ant-design/pro-components';
import { App as AntdApp, Badge, Button, ConfigProvider, Dropdown, Space, Tooltip, message, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  BellOutlined,
  BankOutlined,
  BgColorsOutlined,
  CarOutlined,
  DashboardOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  MessageOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ProLayout } from '@ant-design/pro-components';
import CustomerPage from './pages/Customer';
import Dashboard from './pages/Dashboard';
import LogPage from './pages/Log';
import PolicyPage from './pages/Policy';
import CommercialInsurancePage from './pages/CommercialInsurance';
import CompulsoryInsurancePage from './pages/CompulsoryInsurance';
import InsuranceCompanyPage from './pages/InsuranceCompany';
import RenewalPage from './pages/Renewal';
import UserPage from './pages/User';
import VehiclePage from './pages/Vehicle';
import { updateUser } from './services/api';

const menuRoutes = [
  { path: '/dashboard', name: '仪表盘', icon: <DashboardOutlined /> },
  { path: '/customers', name: '客户管理', icon: <UserOutlined /> },
  { path: '/vehicles', name: '车辆管理', icon: <CarOutlined /> },
  { path: '/policies', name: '保单管理', icon: <FileProtectOutlined /> },
  { path: '/insurance-companies', name: '保险公司管理', icon: <BankOutlined /> },
  { path: '/compulsory-insurances', name: '交强险管理', icon: <SafetyCertificateOutlined /> },
  { path: '/commercial-insurances', name: '商业险管理', icon: <SafetyCertificateOutlined /> },
  { path: '/renewals', name: '续保管理', icon: <SyncOutlined /> },
  { path: '/users', name: '用户管理', icon: <TeamOutlined /> },
  { path: '/logs', name: '操作日志', icon: <FileSearchOutlined /> },
];

const defaultUser = {
  id: 1,
  username: 'admin',
  role: '管理员',
  email: 'admin@insurance.com',
  phone: '13800000001',
  status: '启用',
};

const userStorageKey = 'car_insurance_current_user';
const themeStorageKey = 'car_insurance_theme_mode';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(userStorageKey)) || defaultUser;
  } catch {
    return defaultUser;
  }
}

function HeaderActions({ currentUser, themeMode, onThemeChange, onPasswordChange, onLogout }) {
  const themeItems = [
    { key: 'light', label: '浅色主题', icon: <BgColorsOutlined /> },
    { key: 'dark', label: '深色主题', icon: <MoonOutlined /> },
    { key: 'compact', label: '紧凑主题', icon: <SettingOutlined /> },
  ];

  const accountItems = [
    { key: 'password', label: '修改密码', icon: <SettingOutlined /> },
    { type: 'divider' },
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true },
  ];

  return (
    <Space size={4} align="center">
      <Tooltip title="通知">
        <Button type="text" icon={<Badge dot={false}><BellOutlined /></Badge>} />
      </Tooltip>
      <Tooltip title="信息">
        <Button type="text" icon={<Badge dot={false}><MessageOutlined /></Badge>} />
      </Tooltip>
      <Dropdown
        trigger={['click']}
        menu={{
          selectedKeys: [themeMode],
          items: themeItems,
          onClick: ({ key }) => onThemeChange(key),
        }}
      >
        <Button type="text" icon={<BgColorsOutlined />}>
          主题
        </Button>
      </Dropdown>
      <Dropdown
        trigger={['hover']}
        menu={{
          items: accountItems,
          onClick: ({ key }) => {
            if (key === 'password') onPasswordChange();
            if (key === 'logout') onLogout();
          },
        }}
      >
        <Button type="text" icon={<UserOutlined />}>
          {currentUser?.username || '未登录'}
        </Button>
      </Dropdown>
    </Space>
  );
}

function LayoutFrame({ currentUser, themeMode, onThemeChange, passwordModalOpen, setPasswordModalOpen, setCurrentUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem(userStorageKey);
    setCurrentUser(defaultUser);
    message.success('已退出登录');
  };

  const renderMenuItem = (item, dom) => {
    const isPolicy = item.path === '/policies';

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(item.path)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') navigate(item.path);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minWidth: 0,
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>{dom}</span>
        {isPolicy && (
          <Button
            type="text"
            size="small"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              navigate('/policies/query');
            }}
            style={{
              height: 22,
              paddingInline: 9,
              borderColor: '#d9d9d9',
              color: '#262626',
              background: 'transparent',
              fontSize: 13,
              lineHeight: '22px',
              borderRadius: 6,
              boxShadow: 'none',
              borderStyle: 'solid',
              borderWidth: 1,
            }}
          >
            查
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <ProLayout
        title="车辆保单管理系统"
        logo={false}
        layout="mix"
        fixSiderbar
        route={{ routes: menuRoutes }}
        menuItemRender={renderMenuItem}
        actionsRender={() => [
          <HeaderActions
            key="header-actions"
            currentUser={currentUser}
            themeMode={themeMode}
            onThemeChange={onThemeChange}
            onPasswordChange={() => setPasswordModalOpen(true)}
            onLogout={handleLogout}
          />,
        ]}
      >
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<CustomerPage />} />
          <Route path="/vehicles" element={<VehiclePage />} />
          <Route path="/policies" element={<PolicyPage mode="create" />} />
          <Route path="/policies/query" element={<PolicyPage mode="query" />} />
          <Route path="/insurance-companies" element={<InsuranceCompanyPage />} />
          <Route path="/compulsory-insurances" element={<CompulsoryInsurancePage />} />
          <Route path="/commercial-insurances" element={<CommercialInsurancePage />} />
          <Route path="/renewals" element={<RenewalPage />} />
          <Route path="/users" element={<UserPage />} />
          <Route path="/logs" element={<LogPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ProLayout>

      <ModalForm
        title="修改密码"
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        width={420}
        modalProps={{ destroyOnClose: true, maskClosable: false }}
        submitter={{
          searchConfig: {
            submitText: '保存',
            resetText: '取消',
          },
        }}
        onFinish={async (values) => {
          if (values.password !== values.confirm_password) {
            message.error('两次输入的密码不一致');
            return false;
          }

          const updatedUser = await updateUser(currentUser.id, {
            email: currentUser.email,
            phone: currentUser.phone,
            role: currentUser.role,
            status: currentUser.status,
            password: values.password,
          });
          setCurrentUser(updatedUser);
          message.success('密码已更新');
          return true;
        }}
      >
        <ProFormText.Password
          name="password"
          label="新密码"
          rules={[{ required: true, message: '请输入新密码' }]}
          fieldProps={{ autoComplete: 'new-password' }}
        />
        <ProFormText.Password
          name="confirm_password"
          label="确认密码"
          rules={[{ required: true, message: '请再次输入新密码' }]}
          fieldProps={{ autoComplete: 'new-password' }}
        />
      </ModalForm>
    </>
  );
}

function AppShell() {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [themeMode, setThemeMode] = useState(localStorage.getItem(themeStorageKey) || 'light');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(userStorageKey, JSON.stringify(currentUser || defaultUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  const algorithms = useMemo(() => {
    if (themeMode === 'dark') return [theme.darkAlgorithm];
    if (themeMode === 'compact') return [theme.defaultAlgorithm, theme.compactAlgorithm];
    return [theme.defaultAlgorithm];
  }, [themeMode]);

  return (
    <ConfigProvider locale={zhCN} theme={{ algorithm: algorithms }}>
      <AntdApp>
        <BrowserRouter>
          <LayoutFrame
            currentUser={currentUser}
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            passwordModalOpen={passwordModalOpen}
            setPasswordModalOpen={setPasswordModalOpen}
            setCurrentUser={setCurrentUser}
          />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default function App() {
  return <AppShell />;
}
