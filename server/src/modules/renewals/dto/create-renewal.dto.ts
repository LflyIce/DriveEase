import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class CreateRenewalDto {
  @ApiProperty()
  oldPolicyId: number;

  @ApiProperty()
  remindDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  note?: string;
}
