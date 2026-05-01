export const defaultUser = {
  id: 1,
  username: 'admin',
  role: '管理员',
  email: 'admin@insurance.com',
  phone: '13800000001',
  status: '启用',
};

export const userStorageKey = 'car_insurance_current_user';
export const authStorageKey = 'car_insurance_auth_status';

export function createAuthenticatedUser(values = {}) {
  return {
    ...defaultUser,
    username: values.username?.trim() || defaultUser.username,
    email: values.email?.trim() || defaultUser.email,
    phone: values.phone?.trim() || defaultUser.phone,
  };
}

export function validateLoginFields(values = {}) {
  if (!values.username?.trim() || !values.password?.trim()) {
    return '请输入账号和密码';
  }

  return '';
}

export function validateRegisterFields(values = {}) {
  if (!values.username?.trim() || !values.email?.trim() || !values.phone?.trim()) {
    return '请完善注册信息';
  }

  if (!values.password?.trim() || values.password.length < 6) {
    return '密码至少需要 6 位';
  }

  if (values.password !== values.confirmPassword) {
    return '两次输入的密码不一致';
  }

  return '';
}
