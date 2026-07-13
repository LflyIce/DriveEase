import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * 全局异常过滤器：统一输出 { code, message, data: null, timestamp }。
 * HttpException 取其 status 与 message；class-validator 的 message 数组用 '; ' 连接。
 * TypeORM QueryFailedError（NOT NULL / UNIQUE 等约束违反）翻译为中文友好提示，并按 400 返回。
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status = this.resolveStatus(exception);

    const message = this.resolveMessage(exception);

    // 仅记录真正的服务端错误（500），约束违反等 4xx 不刷错误日志
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

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    // 数据库约束违反属于客户端输入问题，按 400 返回（否则会被当成 500 吞进错误日志）
    if (exception instanceof QueryFailedError) return HttpStatus.BAD_REQUEST;
    return HttpStatus.INTERNAL_SERVER_ERROR;
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
    if (exception instanceof QueryFailedError) {
      return this.translateDbError(exception.message);
    }
    if (exception instanceof Error) return exception.message || '服务器内部错误';
    return '服务器内部错误';
  }

  /** 将 SQLite/TypeORM 原生约束错误翻译为中文，避免把英文 QueryFailedError 直接抛给用户。 */
  private translateDbError(raw: string): string {
    const msg = raw || '';

    let m = msg.match(/NOT NULL constraint failed: (\w+)\.(\w+)/);
    if (m) {
      return `${this.columnLabel(m[1], m[2])}不能为空`;
    }
    m = msg.match(/UNIQUE constraint failed: (\w+)\.(\w+)/);
    if (m) {
      return `${this.columnLabel(m[1], m[2])}已存在，请勿重复`;
    }
    // SQLite 外键约束（如 vehicle.customer_id 不存在）
    if (/FOREIGN KEY constraint failed/i.test(msg)) {
      return '关联数据不存在，请检查关联项';
    }
    if (/CHECK constraint failed/i.test(msg)) {
      return '数据不符合校验规则，请检查枚举值';
    }
    // 兜底：约束类问题统一为「数据校验失败」，不暴露底层英文
    if (/constraint|SQLITE_CONSTRAINT/i.test(msg)) {
      return '数据校验失败，请检查必填项与重复值';
    }
    return msg || '数据校验失败';
  }

  /** 表.列 → 中文标签，用于约束错误提示。未命中时回退用列名。 */
  private columnLabel(table: string, column: string): string {
    const map: Record<string, string> = {
      'customer.name': '客户名称',
      'customer.phone': '手机号码',
      'customer.email': '邮箱',
      'customer.id_number': '证件号',
      'vehicle.plate_number': '车牌号',
      'vehicle.brand': '品牌',
      'vehicle.model': '型号',
      'vehicle.vin': '车架号',
      'vehicle.engine_number': '发动机号',
      'vehicle.customer_id': '所属客户',
      'policy.policy_number': '保单号',
      'policy.customer_id': '投保人',
      'policy.vehicle_id': '车辆',
      'policy.insurance_type': '险种',
      'policy.premium': '保费',
      'policy.sum_insured': '保额',
      'policy.start_date': '起保日期',
      'policy.end_date': '到期日期',
      'user.username': '用户名',
      'user.password': '密码',
      'insurance_company.name': '保险公司名称',
      'compulsory_insurance_type.name': '交强险险种名称',
      'commercial_insurance_type.name': '商业险险种名称',
    };
    return map[`${table}.${column}`] || column;
  }
}
