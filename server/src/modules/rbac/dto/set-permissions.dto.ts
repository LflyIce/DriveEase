import { IsArray, IsString } from 'class-validator';

/** 全量覆盖某角色的权限码（传该角色最终应拥有的全部权限码；空数组=清空） */
export class SetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  codes!: string[];
}
