import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryPolicyDto } from './dto/query-policy.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { UpdatePolicyStatusDto } from './dto/update-policy-status.dto';
import { CreatePolicyFullDto } from './dto/create-policy-full.dto';
import { PoliciesService } from './policies.service';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: '保单列表（分页+关键字+状态，关键字跨客户/车辆）' })
  findMany(@Query() query: QueryPolicyDto) {
    return this.policiesService.findMany(
      query.page,
      query.pageSize,
      query.keyword,
      query.status,
      query.expiryWithin,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '保单详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.policiesService.findOneOrFail(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增保单' })
  create(@Body() dto: CreatePolicyDto) {
    return this.policiesService.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑保单' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePolicyDto) {
    return this.policiesService.updateOne(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '变更保单状态' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePolicyStatusDto) {
    return this.policiesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除保单' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.policiesService.deleteOne(id);
  }

  @Post('full')
  @HttpCode(200)
  @ApiOperation({ summary: '聚合录入：upsert 客户+车辆 + 新建保单' })
  createFull(@Body() body: CreatePolicyFullDto) {
    return this.policiesService.createFull(body);
  }
}
