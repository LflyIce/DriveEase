import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdatePolicyStatusDto {
  @ApiProperty({ description: "'生效' | '待生效' | '已过期' | '已退保'" })
  @IsString()
  status: string;
}
