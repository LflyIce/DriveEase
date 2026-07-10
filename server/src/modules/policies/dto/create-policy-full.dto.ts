import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

/**
 * POST /policies/full 聚合录入：客户 + 车辆 + 保单一次提交（扁平结构）。
 * 字段全部可选（服务层按 phone 复用客户、按 plateNumber 复用车辆、推导 insuranceType）。
 */
export class CreatePolicyFullDto {
  // 客户
  @ApiPropertyOptional() @IsOptional() name?: any;
  @ApiPropertyOptional() @IsOptional() phone?: any;
  @ApiPropertyOptional() @IsOptional() idNumber?: any;
  @ApiPropertyOptional() @IsOptional() birthday?: any;
  @ApiPropertyOptional() @IsOptional() customerType?: any;
  @ApiPropertyOptional() @IsOptional() businessAttribution?: any;
  @ApiPropertyOptional() @IsOptional() businessArea?: any;
  @ApiPropertyOptional() @IsOptional() address?: any;
  @ApiPropertyOptional() @IsOptional() followStatus?: any;
  @ApiPropertyOptional() @IsOptional() ssnFront?: any;
  @ApiPropertyOptional() @IsOptional() businessLicense?: any;
  @ApiPropertyOptional() @IsOptional() ssnBack?: any;
  @ApiPropertyOptional() @IsOptional() idAuthority?: any;
  @ApiPropertyOptional() @IsOptional() idValidDate?: any;

  // 车辆
  @ApiPropertyOptional() @IsOptional() plateNumber?: any;
  @ApiPropertyOptional() @IsOptional() brandModel?: any;
  @ApiPropertyOptional() @IsOptional() vin?: any;
  @ApiPropertyOptional() @IsOptional() engineNumber?: any;
  @ApiPropertyOptional() @IsOptional() energyType?: any;
  @ApiPropertyOptional() @IsOptional() vehicleType?: any;
  @ApiPropertyOptional() @IsOptional() registerDate?: any;
  @ApiPropertyOptional() @IsOptional() certificateDate?: any;
  @ApiPropertyOptional() @IsOptional() nextInspectionDate?: any;
  @ApiPropertyOptional() @IsOptional() transferFlag?: any;
  @ApiPropertyOptional() @IsOptional() seats?: any;
  @ApiPropertyOptional() @IsOptional() loadCapacity?: any;
  @ApiPropertyOptional() @IsOptional() drivingFront?: any;
  @ApiPropertyOptional() @IsOptional() drivingBack?: any;

  // 保单
  @ApiPropertyOptional() @IsOptional() premium?: any;
  @ApiPropertyOptional() @IsOptional() sumInsured?: any;
  @ApiPropertyOptional() @IsOptional() policyDate?: any;
  @ApiPropertyOptional() @IsOptional() expiryDate?: any;
  @ApiPropertyOptional() @IsOptional() insuranceCompany?: any;
  @ApiPropertyOptional() @IsOptional() salesPerson?: any;
  @ApiPropertyOptional() @IsOptional() remark?: any;
  @ApiPropertyOptional() @IsOptional() trafficPremium?: any;
  @ApiPropertyOptional() @IsOptional() travelTax?: any;
  @ApiPropertyOptional() @IsOptional() commercialPremium?: any;
  @ApiPropertyOptional() @IsOptional() surchargePremium?: any;
  @ApiPropertyOptional() @IsOptional() surchargePremium2?: any;
  @ApiPropertyOptional() @IsOptional() commission?: any;
  @ApiPropertyOptional() @IsOptional() expenses?: any;
  @ApiPropertyOptional() @IsOptional() trafficRate?: any;
  @ApiPropertyOptional() @IsOptional() trafficCharge?: any;
  @ApiPropertyOptional() @IsOptional() commercialRate?: any;
  @ApiPropertyOptional() @IsOptional() commercialCharge?: any;
  @ApiPropertyOptional() @IsOptional() surchargeRate?: any;
  @ApiPropertyOptional() @IsOptional() surchargeCharge?: any;
  @ApiPropertyOptional() @IsOptional() surchargeRate2?: any;
  @ApiPropertyOptional() @IsOptional() surchargeCharge2?: any;
  @ApiPropertyOptional() @IsOptional() totalCharge?: any;
  @ApiPropertyOptional() @IsOptional() quotation?: any;
  @ApiPropertyOptional() @IsOptional() policyFile?: any;
}
