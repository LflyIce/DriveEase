import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class QueryPolicyDto extends PaginationDto {
  @ApiPropertyOptional({ description: "'生效' | '待生效' | '已过期' | '已退保'" })
  @IsOptional()
  @IsString()
  status?: string;
}
