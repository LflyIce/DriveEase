import type { UserInfo } from '@vben/types';

import { fetchMeApi } from './auth';

const USER_STORAGE_KEY = 'driveease_user';

/**
 * 获取用户信息
 *
 * 阶段B：改为调 /auth/me 取真实用户信息（含 roleCode + 权限码）。
 * 登录态由后端 JWT 校验（token 存 accessStore，request.ts 自动带 Bearer）。
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  const me = await fetchMeApi();
  // 同步缓存，兼容可能直接读 localStorage 的逻辑
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(me));
  return {
    avatar: '',
    homePath: '/dashboard',
    realName: me.username,
    roles: [me.role],
    userId: String(me.id),
    username: me.username,
  } as UserInfo;
}
