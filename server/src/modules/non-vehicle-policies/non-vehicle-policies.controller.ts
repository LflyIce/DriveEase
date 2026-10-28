import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CreateNonVehiclePolicyDto } from './dto/create-non-vehicle-policy.dto';
import { QueryNonVehiclePolicyDto } from './dto/query-non-vehicle-policy.dto';
import { NonVehiclePoliciesService } from './non-vehicle-policies.service';

@ApiTags('non-vehicle-policies')
@Controller('non-vehicle-policies')
export class NonVehiclePoliciesController {
  constructor(private readonly service: NonVehiclePoliciesService) {}

  @Get()
  @ApiOperation({ summary: '非车保单列表（分页+关键字+业务员+创建时间范围，附保费/支出/结余合计）' })
  findMany(@Query() query: QueryNonVehiclePolicyDto) {
    return this.service.findMany(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '非车保单详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneOrFail(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '非车极速开单（结余=保费-支出服务端计算）' })
  @RequirePermissions('nonvehicle:create')
  create(@Body() dto: CreateNonVehiclePolicyDto) {
    return this.service.createOne(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除非车保单' })
  @RequirePermissions('nonvehicle:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOne(id);
  }
}
