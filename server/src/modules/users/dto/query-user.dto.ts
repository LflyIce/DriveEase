import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/dto/pagination.dto';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({ description: "'管理员' | '普通员工'" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "'启用' | '禁用'" })
  @IsOptional()
  @IsString()
  status?: string;
}
