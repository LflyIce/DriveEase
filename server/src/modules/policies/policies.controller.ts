import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { RbacService } from '../rbac/rbac.service';
import { QueryPolicyDto } from './dto/query-policy.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { UpdatePolicyStatusDto } from './dto/update-policy-status.dto';
import { CreatePolicyFullDto } from './dto/create-policy-full.dto';
import { PoliciesService } from './policies.service';

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private readonly rbacService: RbacService,
  ) {}

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
  @RequirePermissions('policy:create')
  create(@Body() dto: CreatePolicyDto) {
    return this.policiesService.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑保单' })
  @RequirePermissions('policy:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePolicyDto) {
    return this.policiesService.updateOne(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '变更保单状态（激活/退保等）' })
  async updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePolicyStatusDto,
  ) {
    // 退保需 policy:surrender，其余状态变更（激活等）需 policy:activate（动态校验，不走静态装饰器）
    const code = dto.status === '已退保' ? 'policy:surrender' : 'policy:activate';
    await this.rbacService.checkPermission(req.user, code);
    return this.policiesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除保单' })
  @RequirePermissions('policy:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.policiesService.deleteOne(id);
  }

  @Post('full')
  @HttpCode(200)
  @ApiOperation({ summary: '聚合录入：upsert 客户+车辆 + 新建保单' })
  @RequirePermissions('policy:create')
  createFull(@Body() body: CreatePolicyFullDto) {
    return this.policiesService.createFull(body);
  }
}
