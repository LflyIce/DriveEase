import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OcrService } from './ocr.service';

@ApiTags('ocr')
@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Get('vehicle-license')
  @ApiOperation({ summary: '行驶证识别 → 映射后的保单/车辆字段' })
  async vehicleLicense(@Query('imageUrl') imageUrl: string, @Query('side') side?: string) {
    if (!imageUrl) throw new BadRequestException('缺少 imageUrl');
    return this.ocrService.vehicleLicense(imageUrl, side === 'back' ? 'back' : 'front');
  }

  @Get('id-card')
  @ApiOperation({ summary: '身份证识别 → 映射后的客户字段' })
  async idCard(@Query('imageUrl') imageUrl: string, @Query('side') side?: string) {
    if (!imageUrl) throw new BadRequestException('缺少 imageUrl');
    return this.ocrService.idCard(imageUrl, side === 'back' ? 'back' : 'front');
  }
}
