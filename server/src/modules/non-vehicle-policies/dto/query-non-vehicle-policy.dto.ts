import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class QueryNonVehiclePolicyDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '到期窗口（天）：如 30、10；只看未过期且未来 N 天内到期的保单',
  })
  @IsOptional()
  @Type(() => Number)
  expiryWithin?: number;

  @ApiPropertyOptional({ description: '业务员（精确匹配）' })
  @IsOptional()
  @IsString()
  salesPerson?: string;

  @ApiPropertyOptional({ description: '创建时间起（YYYY-MM-DD，含当日）' })
  @IsOptional()
  @IsString()
  createdStart?: string;

  @ApiPropertyOptional({ description: '创建时间止（YYYY-MM-DD，自动含当日 23:59:59）' })
  @IsOptional()
  @IsString()
  createdEnd?: string;
}
