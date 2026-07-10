import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: '车辆列表（分页+关键字+客户）' })
  findMany(@Query() query: QueryVehicleDto) {
    return this.vehiclesService.findMany(query.page, query.pageSize, query.keyword, query.customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: '车辆详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOneOrFail(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增车辆' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑车辆' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除车辆' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.deleteOne(id);
  }
}
