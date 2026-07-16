import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

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

  @ApiPropertyOptional({ description: '显示用角色名（传 roleId 后由后端按角色名回填）' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: '关联角色 id' })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @ApiPropertyOptional({ description: "'启用' | '禁用'" })
  @IsOptional()
  @IsString()
  status?: string;
}
