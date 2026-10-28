import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class QueryNonVehiclePolicyDto extends PaginationDto {
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
