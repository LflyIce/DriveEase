import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class QueryRenewalDto extends PaginationDto {
  @ApiPropertyOptional({ description: "'待提醒' | '已提醒' | '已续保' | '已过期'" })
  @IsOptional()
  @IsString()
  status?: string;
}
