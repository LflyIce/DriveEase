import { Injectable } from '@nestjs/common';
import { LogService } from '../../shared/audit/log.service';
import { recognizeIDCard, recognizeVehicleLicense } from './ocr.tencent';

@Injectable()
export class OcrService {
  constructor(private readonly logger: LogService) {}

  async vehicleLicense(imageUrl: string, side: 'front' | 'back'): Promise<any> {
    const info = await recognizeVehicleLicense(imageUrl, side);
    this.logger.log('OCR 行驶证识别', imageUrl);
    return info;
  }

  async idCard(imageUrl: string, side: 'front' | 'back'): Promise<any> {
    const info = await recognizeIDCard(imageUrl, side);
    this.logger.log('OCR 身份证识别', imageUrl);
    return info;
  }
}
