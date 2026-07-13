import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class QueryPolicyDto extends PaginationDto {
  @ApiPropertyOptional({ description: "'生效' | '待生效' | '已过期' | '已退保'" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: '到期窗口（天）：如 30、10；只看未过期且未来 N 天内到期的保单',
  })
  @IsOptional()
  @Type(() => Number)
  expiryWithin?: number;
}
