import type { UserInfo } from '@vben/types';

const USER_STORAGE_KEY = 'driveease_user';

/**
 * 获取用户信息
 *
 * DriveEase 后端没有 /user/info 接口；登录时已把 user 缓存到 localStorage，
 * 这里读出并映射成 vben 的 UserInfo。
 */
export async function getUserInfoApi(): Promise<UserInfo> {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    throw new Error('未登录或登录已失效，请重新登录');
  }
  const user = JSON.parse(raw) as Record<string, any>;
  return {
    avatar: '',
    homePath: '/dashboard',
    realName: user.username,
    roles: [user.role],
    userId: String(user.id),
    username: user.username,
  } as UserInfo;
}
