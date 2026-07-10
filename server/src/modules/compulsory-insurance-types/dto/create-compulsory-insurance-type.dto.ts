import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateCompulsoryInsuranceTypeDto {
  @ApiProperty()
  @IsString()
  name: string;
}
