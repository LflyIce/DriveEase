import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

/** PUT /non-vehicle-policies/:id 编辑非车保单：字段宽松（服务层对未传字段走 existing 兜底），结余服务端重算 */
export class UpdateNonVehiclePolicyDto {
  @ApiPropertyOptional() @IsOptional() enterpriseName?: any;
  @ApiPropertyOptional() @IsOptional() insuranceType?: any;
  @ApiPropertyOptional() @IsOptional() projectName?: any;
  @ApiPropertyOptional() @IsOptional() personInCharge?: any;
  @ApiPropertyOptional() @IsOptional() contactPhone?: any;
  @ApiPropertyOptional() @IsOptional() sumInsured?: any;
  @ApiPropertyOptional() @IsOptional() premium?: any;
  @ApiPropertyOptional() @IsOptional() fee?: any;
  @ApiPropertyOptional() @IsOptional() expenses?: any;
  @ApiPropertyOptional() @IsOptional() insuranceCompany?: any;
  @ApiPropertyOptional() @IsOptional() salesPerson?: any;
  @ApiPropertyOptional() @IsOptional() startDate?: any;
  @ApiPropertyOptional() @IsOptional() endDate?: any;
  @ApiPropertyOptional() @IsOptional() attachment?: any;
  @ApiPropertyOptional() @IsOptional() remark?: any;
}
