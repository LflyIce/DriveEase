import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { QueryRenewalDto } from './dto/query-renewal.dto';
import { CreateRenewalDto } from './dto/create-renewal.dto';
import { UpdateRenewalDto } from './dto/update-renewal.dto';
import { RenewDto } from './dto/renew.dto';
import { RenewalsService } from './renewals.service';

@ApiTags('renewals')
@Controller('renewals')
export class RenewalsController {
  constructor(private readonly renewalsService: RenewalsService) {}

  @Get()
  @ApiOperation({ summary: '续保记录列表（分页+状态）' })
  findMany(@Query() query: QueryRenewalDto) {
    return this.renewalsService.findMany(query.page, query.pageSize, query.status);
  }

  // 注意：upcoming 必须声明在任何 :id 路由之前，避免被 :id 捕获
  @Get('upcoming')
  @ApiOperation({ summary: '即将到期续保提醒（今~+30天，不分页）' })
  findUpcoming() {
    return this.renewalsService.findUpcoming();
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增续保记录' })
  @RequirePermissions('renewal:create')
  create(@Body() dto: CreateRenewalDto) {
    return this.renewalsService.createOne(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新续保记录（状态/备注）' })
  @RequirePermissions('renewal:renew')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRenewalDto) {
    return this.renewalsService.updateOne(id, dto);
  }

  @Post(':id/renew')
  @HttpCode(200)
  @ApiOperation({ summary: '续保：克隆旧保单生成新保单' })
  @RequirePermissions('renewal:renew')
  renew(@Param('id', ParseIntPipe) id: number, @Body() body: RenewDto) {
    return this.renewalsService.renew(id, body);
  }
}
