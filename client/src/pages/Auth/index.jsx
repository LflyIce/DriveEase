import React, { useState } from 'react';
import { Button, Checkbox, Form, Input, message } from 'antd';
import {
  CarOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import authBackground from '../../../../images/ChatGPT Image 2026年5月1日 09_04_14.png';
import { validateLoginFields, validateRegisterFields } from '../../auth/authModel';
import './style.css';

export default function AuthPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  const isLogin = mode === 'login';

  const handleLogin = (values) => {
    const error = validateLoginFields(values);

    if (error) {
      message.warning(error);
      return;
    }

    onLogin(values);
  };

  const handleRegister = (values) => {
    const error = validateRegisterFields(values);

    if (error) {
      message.warning(error);
      return;
    }

    onRegister(values);
    registerForm.resetFields();
    loginForm.setFieldsValue({ username: values.username });
    setMode('login');
  };

  return (
    <main
      className="auth-shell"
      style={{
        backgroundImage: `linear-gradient(112deg, rgba(6, 22, 45, 0.78), rgba(9, 26, 54, 0.42) 48%, rgba(7, 13, 26, 0.76)), url("${authBackground}")`,
      }}
    >
      <section className="auth-brand" aria-label="系统信息">
        <div className="auth-logo">
          <CarOutlined />
        </div>
        <div>
          <h1>车辆保单管理系统</h1>
        </div>
      </section>

      <section className="auth-card" aria-label={isLogin ? '登录' : '注册'}>
        <div className="auth-card-glow" />

        <div className="auth-tabs" role="tablist" aria-label="登录注册切换">
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => setMode('login')}
            role="tab"
            aria-selected={isLogin}
          >
            登录
          </button>
          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => setMode('register')}
            role="tab"
            aria-selected={!isLogin}
          >
            注册
          </button>
        </div>

        <div className="auth-heading">
          <SafetyCertificateOutlined />
          <div>
            <h2>{isLogin ? '欢迎回来' : '创建账号'}</h2>
            <p>{isLogin ? '进入后台管理工作台' : '完善信息后即可登录系统'}</p>
          </div>
        </div>

        {isLogin ? (
          <Form form={loginForm} layout="vertical" className="auth-form" onFinish={handleLogin} requiredMark={false}>
            <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
              <Input size="large" prefix={<UserOutlined />} placeholder="admin" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>
            <div className="auth-row">
              <Checkbox>记住我</Checkbox>
              <button type="button" className="auth-link">
                忘记密码
              </button>
            </div>
            <Button className="auth-submit" type="primary" htmlType="submit" size="large" block>
              登录系统
            </Button>
          </Form>
        ) : (
          <Form
            form={registerForm}
            layout="vertical"
            className="auth-form"
            onFinish={handleRegister}
            requiredMark={false}
          >
            <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input size="large" prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }]}>
              <Input size="large" prefix={<MailOutlined />} placeholder="name@example.com" autoComplete="email" />
            </Form.Item>
            <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
              <Input size="large" prefix={<PhoneOutlined />} placeholder="13800000000" autoComplete="tel" />
            </Form.Item>
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="至少 6 位" autoComplete="new-password" />
            </Form.Item>
            <Form.Item name="confirmPassword" label="确认密码" rules={[{ required: true, message: '请确认密码' }]}>
              <Input.Password size="large" prefix={<LockOutlined />} placeholder="再次输入密码" autoComplete="new-password" />
            </Form.Item>
            <Button className="auth-submit" type="primary" htmlType="submit" size="large" block>
              注册账号
            </Button>
          </Form>
        )}
      </section>
    </main>
  );
}
