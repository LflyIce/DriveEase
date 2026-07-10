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
}
