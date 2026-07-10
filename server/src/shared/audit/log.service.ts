import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * 集中写操作日志。当前 operator 统一为 '管理员'（与原路由硬编码一致，
 * 真实调用方暂未透传）—— 后续接入真认证时，仅需在此处改动即可。
 * 内部捕获异常：审计日志失败不影响主流程，调用方可 fire-and-forget。
 */
@Injectable()
export class LogService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async log(
    action: string,
    target?: string,
    detail?: string,
    operator = '管理员',
    result = '成功',
  ): Promise<void> {
    try {
      await this.dataSource.query(
        'INSERT INTO operation_log (operator, action, target, detail, result) VALUES (?, ?, ?, ?, ?)',
        [operator, action, target || '', detail || '', result],
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('operation_log insert failed:', e);
    }
  }
}
