import { requestClient } from '#/api/request';

/**
 * DriveEase 账号体系对接（无 token 模式，镜像原 React 端行为）：
 * - 后端 POST /api/users/login 校验账号密码后直接返回 user 对象，不签发 token；
 * - 这里伪造一个固定 token 仅用于满足 vben accessStore 的守门逻辑；
 * - 登录成功的 user 缓存到 localStorage，供 getUserInfoApi 读取（后端无 /user/info）。
 */
const USER_STORAGE_KEY = 'driveease_user';
const FAKE_TOKEN = 'driveease-fake-token';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值（vben 约定） */
  export interface LoginResult {
    accessToken: string;
  }

  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  const user = await requestClient.post('/users/login', data);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return { accessToken: FAKE_TOKEN } as AuthApi.LoginResult;
}

/**
 * 刷新 accessToken（后端无此能力，保持占位）
 */
export async function refreshTokenApi(): Promise<AuthApi.RefreshTokenResult> {
  return { data: FAKE_TOKEN, status: 200 };
}

/**
 * 退出登录（清理本地缓存即可，不调用后端）
 */
export async function logoutApi() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * 获取用户权限码（后端无细粒度权限，返回空）
 */
export async function getAccessCodesApi(): Promise<string[]> {
  return [];
}
