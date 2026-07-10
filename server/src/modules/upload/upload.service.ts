import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import COS from 'cos-nodejs-sdk-v5';
import path from 'path';
import { LogService } from '../../shared/audit/log.service';

@Injectable()
export class UploadService {
  private cosInstance: any = null;

  constructor(private readonly logger: LogService) {}

  // COS 凭证延迟初始化（等 ConfigModule 载入 server/.env 后再建实例）
  private getCos(): any {
    if (!this.cosInstance) {
      this.cosInstance = new COS({
        SecretId: process.env.COS_SECRET_ID,
        SecretKey: process.env.COS_SECRET_KEY,
      });
    }
    return this.cosInstance;
  }

  private isConfigured(): boolean {
    return !!(
      process.env.COS_BUCKET &&
      process.env.COS_REGION &&
      process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY
    );
  }

  async uploadOne(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    if (!file) throw new BadRequestException('未提供文件');
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('COS 未配置（请填写 server/.env）');
    }

    const ext = path.extname(file.originalname) || '';
    const today = new Date().toISOString().slice(0, 10);
    const key = `policy/${today}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;

    await this.getCos().putObject({
      Bucket: process.env.COS_BUCKET,
      Region: process.env.COS_REGION,
      Key: key,
      Body: file.buffer,
    });

    const url = `https://${process.env.COS_BUCKET}.cos.${process.env.COS_REGION}.myqcloud.com/${key}`;
    this.logger.log('上传文件', file.originalname);
    return { url, filename: file.originalname };
  }
}
