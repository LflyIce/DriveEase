import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * 全局异常过滤器：统一输出 { code, message, data: null, timestamp }。
 * HttpException 取其 status 与 message；class-validator 的 message 数组用 '; ' 连接。
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception);

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (typeof resp === 'string') return resp;
      const msg = (resp as any).message;
      if (Array.isArray(msg)) return msg.join('; ');
      if (msg) return String(msg);
      return exception.message;
    }
    if (exception instanceof Error) return exception.message || 'Internal server error';
    return 'Internal server error';
  }
}
