import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

/** POST /renewals/:id/renew —— 续保生成新保单的可选覆盖项 */
export class RenewDto {
  @ApiPropertyOptional() @IsOptional() policyNumber?: any;
  @ApiPropertyOptional() @IsOptional() startDate?: any;
  @ApiPropertyOptional() @IsOptional() endDate?: any;
  @ApiPropertyOptional() @IsOptional() insuranceType?: any;
  @ApiPropertyOptional() @IsOptional() premium?: any;
  @ApiPropertyOptional() @IsOptional() sumInsured?: any;
  @ApiPropertyOptional() @IsOptional() remark?: any;
}
