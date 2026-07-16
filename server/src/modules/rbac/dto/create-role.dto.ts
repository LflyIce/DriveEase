import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: '角色名称不能为空' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: '角色编码不能为空' })
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
