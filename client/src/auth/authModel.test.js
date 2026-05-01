import test from 'node:test';
import assert from 'node:assert/strict';

import { createAuthenticatedUser, validateLoginFields, validateRegisterFields } from './authModel.js';

test('validateLoginFields rejects empty credentials', () => {
  assert.equal(validateLoginFields({ username: '', password: '' }), '请输入账号和密码');
});

test('validateRegisterFields requires matching passwords', () => {
  assert.equal(
    validateRegisterFields({
      username: 'demo',
      email: 'demo@example.com',
      phone: '13800000000',
      password: 'secret123',
      confirmPassword: 'secret321',
    }),
    '两次输入的密码不一致',
  );
});

test('createAuthenticatedUser keeps submitted identity with admin defaults', () => {
  assert.deepEqual(createAuthenticatedUser({ username: 'demo', email: 'demo@example.com', phone: '13800000000' }), {
    id: 1,
    username: 'demo',
    role: '管理员',
    email: 'demo@example.com',
    phone: '13800000000',
    status: '启用',
  });
});
