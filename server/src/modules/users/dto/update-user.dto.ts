import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "'管理员' | '普通员工'" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "'启用' | '禁用'" })
  @IsOptional()
  @IsString()
  status?: string;
}
