import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdatePolicyDto {
  @ApiPropertyOptional() @IsOptional() policyNumber?: string;
  @ApiPropertyOptional() @IsOptional() customerId?: number;
  @ApiPropertyOptional() @IsOptional() vehicleId?: number;
  @ApiPropertyOptional() @IsOptional() insuranceType?: string;
  @ApiPropertyOptional() @IsOptional() premium?: number;
  @ApiPropertyOptional() @IsOptional() sumInsured?: number;
  @ApiPropertyOptional() @IsOptional() issueTime?: string;
  @ApiPropertyOptional() @IsOptional() policyDate?: string;
  @ApiPropertyOptional() @IsOptional() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() certificateType?: string;
  @ApiPropertyOptional() @IsOptional() certificateNumber?: string;
  @ApiPropertyOptional() @IsOptional() insuranceCompany?: string;
  @ApiPropertyOptional() @IsOptional() contactPerson?: string;
  @ApiPropertyOptional() @IsOptional() contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() salesPerson?: string;
  @ApiPropertyOptional() @IsOptional() compulsoryDetail?: any;
  @ApiPropertyOptional() @IsOptional() commercialDetail?: any;
  @ApiPropertyOptional() @IsOptional() remark?: string;
  // 保费拆分（编辑保单时与录入同口径，可改）
  @ApiPropertyOptional() @IsOptional() trafficPremium?: number;
  @ApiPropertyOptional() @IsOptional() travelTax?: number;
  @ApiPropertyOptional() @IsOptional() commercialPremium?: number;
  @ApiPropertyOptional() @IsOptional() surchargePremium?: number;
  @ApiPropertyOptional() @IsOptional() surchargePremium2?: number;
  // 手续费与支出
  @ApiPropertyOptional() @IsOptional() commission?: number;
  @ApiPropertyOptional() @IsOptional() expenses?: number;
  @ApiPropertyOptional() @IsOptional() trafficRate?: number;
  @ApiPropertyOptional() @IsOptional() trafficCharge?: number;
  @ApiPropertyOptional() @IsOptional() commercialRate?: number;
  @ApiPropertyOptional() @IsOptional() commercialCharge?: number;
  @ApiPropertyOptional() @IsOptional() surchargeRate?: number;
  @ApiPropertyOptional() @IsOptional() surchargeCharge?: number;
  @ApiPropertyOptional() @IsOptional() surchargeRate2?: number;
  @ApiPropertyOptional() @IsOptional() surchargeCharge2?: number;
  @ApiPropertyOptional() @IsOptional() totalCharge?: number;
}
