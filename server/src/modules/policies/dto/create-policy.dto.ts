import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

/** POST /policies 基础新建。明细字段为对象/数组，服务层 JSON.stringify 入库。 */
export class CreatePolicyDto {
  @ApiProperty() policyNumber: string;
  @ApiProperty() customerId: number;
  @ApiProperty() vehicleId: number;
  @ApiProperty() insuranceType: string;
  @ApiProperty() premium: number;
  @ApiProperty() sumInsured: number;

  @ApiPropertyOptional() @IsOptional() issueTime?: string;
  @ApiPropertyOptional() @IsOptional() policyDate?: string;
  @ApiPropertyOptional() @IsOptional() effectiveDate?: string;
  @ApiPropertyOptional() @IsOptional() expiryDate?: string;
  @ApiPropertyOptional() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsOptional() endDate?: string;

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
