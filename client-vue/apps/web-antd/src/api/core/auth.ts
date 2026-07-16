import { requestClient } from '#/api/request';

/**
 * DriveEase 账号体系（JWT 模式）：
 * - 后端 POST /api/users/login 校验密码后返回 { ...user, accessToken }（签发 JWT）；
 * - 这里把 accessToken 返回给 vben accessStore；user 缓存到 localStorage 供 getUserInfoApi 读取；
 * - request.ts 已在每个请求带 Authorization: Bearer <accessToken>。
 */
const USER_STORAGE_KEY = 'driveease_user';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    phone?: string;
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
 * 登录：后端返回 { ...user, accessToken }，拆出 token 给 accessStore，user 落 localStorage。
 */
interface LoginResponse {
  accessToken: string;
  [key: string]: any;
}

export async function loginApi(data: AuthApi.LoginParams) {
  const result = await requestClient.post<LoginResponse>('/users/login', data);
  const { accessToken, ...user } = result;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  return { accessToken } as AuthApi.LoginResult;
}

/** 后端未实现 refresh；preferences 已关 enableRefreshToken，401 直接走重新认证（登出）。 */
export async function refreshTokenApi(): Promise<AuthApi.RefreshTokenResult> {
  return { data: '', status: 200 };
}

/** 退出登录（清理本地缓存即可，不调用后端） */
export async function logoutApi() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

/** /auth/me 返回结构（当前用户 + roleCode + 权限码集） */
export interface MeResult {
  email?: string;
  id: number;
  phone?: string;
  permissions: string[];
  role: string;
  roleCode: null | string;
  roleId: null | number;
  status: string;
  username: string;
}

/** 取当前登录用户信息 + 权限码集（getUserInfoApi 与 getAccessCodesApi 共用） */
export async function fetchMeApi(): Promise<MeResult> {
  return requestClient.get<MeResult>('/auth/me');
}

/** 取当前用户权限码集（供 vben accessStore.setAccessCodes，菜单/按钮过滤依据） */
export async function getAccessCodesApi(): Promise<string[]> {
  const me = await fetchMeApi();
  return me.permissions;
}
