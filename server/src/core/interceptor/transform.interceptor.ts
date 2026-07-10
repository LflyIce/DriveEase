import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { deepCamelKeys } from './camelcase.util';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 统一响应：先把 controller 返回值的键递归转 camelCase，再包成
 * { code: 200, message: 'success', data, timestamp }。外壳键在外层添加，不受 camelCase 影响。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'success',
        data: deepCamelKeys(data),
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
