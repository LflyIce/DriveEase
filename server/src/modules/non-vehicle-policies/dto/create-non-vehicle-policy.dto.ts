import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

/** POST /non-vehicle-policies 极速开单：字段宽松（服务层显式校验必填项），结余服务端计算 */
export class CreateNonVehiclePolicyDto {
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
