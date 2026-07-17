import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** 单个仪表盘卡片的网格布局（gridstack 语义：12 列栅格，x/y 为格坐标，w/h 为格数） */
export class DashboardLayoutItemDto {
  @ApiProperty({ description: 'widget id（前端注册表里的唯一标识）' })
  @IsString()
  id: string;

  @ApiProperty({ description: '列起点（0-11）' })
  @IsInt()
  @Min(0)
  @Max(11)
  x: number;

  @ApiProperty({ description: '行起点' })
  @IsInt()
  @Min(0)
  y: number;

  @ApiProperty({ description: '宽（格数，1-12）' })
  @IsInt()
  @Min(1)
  @Max(12)
  w: number;

  @ApiProperty({ description: '高（格数）' })
  @IsInt()
  @Min(1)
  @Max(100)
  h: number;
}

export class SaveDashboardConfigDto {
  @ApiProperty({ type: [DashboardLayoutItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => DashboardLayoutItemDto)
  layout: DashboardLayoutItemDto[];
}
