import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiPropertyOptional({ description: '未传则默认 123456' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: '登录账号，必须唯一' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @ApiPropertyOptional({ description: "'管理员' | '普通员工'" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "'启用' | '禁用'" })
  @IsOptional()
  @IsString()
  status?: string;
}
