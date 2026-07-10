import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { initSchema } from './schema';

/**
 * 启动时跑一遍 schema（建表 + ensureColumn + 参照表播种），逻辑见 schema.ts（与 seed.ts 复用）。
 * TypeORM synchronize:false，不接管建表；落盘由 sqljs autoSave 负责。
 */
@Injectable()
export class SchemaBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SchemaBootstrapService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    await initSchema(this.dataSource);
    this.logger.log('Schema initialized');
  }
}
