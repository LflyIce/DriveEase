import { SetMetadata } from '@nestjs/common';

/** 标在控制器/方法上：跳过全局 JwtAuthGuard（登录等公开接口） */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
