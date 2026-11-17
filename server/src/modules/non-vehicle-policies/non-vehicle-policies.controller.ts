import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import ExcelJS from 'exceljs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CreateNonVehiclePolicyDto } from './dto/create-non-vehicle-policy.dto';
import { QueryNonVehiclePolicyDto } from './dto/query-non-vehicle-policy.dto';
import { UpdateNonVehiclePolicyDto } from './dto/update-non-vehicle-policy.dto';
import { NonVehiclePoliciesService } from './non-vehicle-policies.service';

/** 导出列（与非车查询列表列一致；不含操作列/ID） */
const NON_VEHICLE_EXPORT_COLUMNS = [
  { header: '企业名称', key: 'enterpriseName', width: 24 },
  { header: '险种', key: 'insuranceType', width: 14 },
  { header: '项目名称', key: 'projectName', width: 18 },
  { header: '负责人', key: 'personInCharge', width: 12 },
  { header: '联系电话', key: 'contactPhone', width: 16 },
  { header: '保额', key: 'sumInsured', width: 12 },
  { header: '保费', key: 'premium', width: 12 },
  { header: '费用', key: 'fee', width: 12 },
  { header: '支出', key: 'expenses', width: 12 },
  { header: '结余', key: 'balance', width: 12 },
  { header: '保险公司', key: 'insuranceCompany', width: 18 },
  { header: '业务员', key: 'salesPerson', width: 12 },
  { header: '起保时间', key: 'startDate', width: 12 },
  { header: '截止日期', key: 'endDate', width: 12 },
  { header: '创建时间', key: 'createdAt', width: 20 },
  { header: '备注', key: 'remark', width: 24 },
  // 附件以 URL 地址文本导出（多文件逗号拼接），不嵌入图片
  { header: '附件', key: 'attachment', width: 48 },
];

async function buildNonVehicleWorkbook(rows: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('非车保单');
  ws.columns = NON_VEHICLE_EXPORT_COLUMNS;
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      enterpriseName: r.enterprise_name ?? '',
      insuranceType: r.insurance_type ?? '',
      projectName: r.project_name ?? '',
      personInCharge: r.person_in_charge ?? '',
      contactPhone: r.contact_phone ?? '',
      sumInsured: r.sum_insured ?? 0,
      premium: r.premium ?? 0,
      fee: r.fee ?? 0,
      expenses: r.expenses ?? 0,
      balance: r.balance ?? 0,
      insuranceCompany: r.insurance_company ?? '',
      salesPerson: r.sales_person ?? '',
      startDate: r.start_date ?? '',
      endDate: r.end_date ?? '',
      createdAt: r.created_at ?? '',
      remark: r.remark ?? '',
      attachment: r.attachment ?? '',
    });
  }
  return Buffer.from((await wb.xlsx.writeBuffer()) as any);
}

@ApiTags('non-vehicle-policies')
@Controller('non-vehicle-policies')
export class NonVehiclePoliciesController {
  constructor(private readonly service: NonVehiclePoliciesService) {}

  @Get()
  @ApiOperation({ summary: '非车保单列表（分页+关键字+业务员+创建时间范围，附保费/支出/结余合计）' })
  findMany(@Query() query: QueryNonVehiclePolicyDto) {
    return this.service.findMany(query);
  }

  // 导出：按当前查询条件（不含分页）生成 xlsx 下载，需 nonvehicle:export 权限
  @Get('export')
  @ApiOperation({ summary: '导出非车保单（Excel，按当前筛选条件）' })
  @RequirePermissions('nonvehicle:export')
  async export(@Res() res: Response, @Query() query: QueryNonVehiclePolicyDto) {
    const rows = await this.service.findAllForExport(query);
    const buffer = await buildNonVehicleWorkbook(rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent('非车保单列表.xlsx')}`,
    );
    res.end(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: '非车保单详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneOrFail(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '非车极速开单（结余=费用-支出服务端计算）' })
  @RequirePermissions('nonvehicle:create')
  create(@Body() dto: CreateNonVehiclePolicyDto) {
    return this.service.createOne(dto);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: '编辑非车保单（结余=费用-支出服务端重算）' })
  @RequirePermissions('nonvehicle:update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNonVehiclePolicyDto,
  ) {
    return this.service.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除非车保单' })
  @RequirePermissions('nonvehicle:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOne(id);
  }
}
