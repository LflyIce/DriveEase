import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { Response } from 'express';

import ExcelJS from 'exceljs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { RbacService } from '../rbac/rbac.service';
import { QueryPolicyDto } from './dto/query-policy.dto';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { UpdatePolicyStatusDto } from './dto/update-policy-status.dto';
import { CreatePolicyFullDto } from './dto/create-policy-full.dto';
import { PoliciesService } from './policies.service';

/** 导出列（与保单查询列表列一致；不含操作列/ID） */
const POLICY_EXPORT_COLUMNS = [
  { header: '保单号', key: 'policyNumber', width: 22 },
  { header: '投保人', key: 'customerName', width: 14 },
  { header: '电话', key: 'customerPhone', width: 16 },
  { header: '车牌号', key: 'plateNumber', width: 12 },
  { header: '保险公司', key: 'insuranceCompany', width: 18 },
  { header: '业务员', key: 'salesPerson', width: 12 },
  { header: '险种', key: 'insuranceType', width: 10 },
  { header: '业务类型', key: 'businessType', width: 10 },
  { header: '保费', key: 'premium', width: 12 },
  { header: '保额', key: 'sumInsured', width: 12 },
  { header: '手续费', key: 'totalCharge', width: 12 },
  { header: '起保日期', key: 'effectiveDate', width: 12 },
  { header: '到期日期', key: 'expiryDate', width: 12 },
  { header: '创建时间', key: 'createdAt', width: 20 },
  { header: '状态', key: 'status', width: 10 },
  // 材料/图片字段以 URL 地址文本导出（多图逗号拼接），不嵌入图片
  { header: '其他承保材料', key: 'quotation', width: 48 },
  { header: '电子保单', key: 'policyFile', width: 40 },
];

async function buildPolicyWorkbook(rows: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('保单列表');
  ws.columns = POLICY_EXPORT_COLUMNS;
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      policyNumber: r.policy_number ?? '',
      customerName: r.customer_name ?? '',
      customerPhone: r.customer_phone ?? '',
      plateNumber: r.plate_number ?? '',
      insuranceCompany: r.insurance_company ?? '',
      salesPerson: r.sales_person ?? '',
      insuranceType: r.insurance_type ?? '',
      businessType: r.business_type ?? '',
      premium: r.premium ?? 0,
      sumInsured: r.sum_insured ?? 0,
      totalCharge: r.total_charge ?? 0,
      effectiveDate: r.effective_date ?? '',
      expiryDate: r.expiry_date ?? '',
      createdAt: r.created_at ?? '',
      status: r.status ?? '',
      quotation: r.quotation ?? '',
      policyFile: r.policy_file ?? '',
    });
  }
  return Buffer.from((await wb.xlsx.writeBuffer()) as any);
}

@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private readonly rbacService: RbacService,
  ) {}

  @Get()
  @ApiOperation({ summary: '保单列表（分页+关键字+状态+业务员+业务类型+创建时间范围，关键字跨客户/车辆；附保费/保额合计）' })
  findMany(@Query() query: QueryPolicyDto) {
    return this.policiesService.findMany(query);
  }

  // 导出：按当前查询条件（不含分页）生成 xlsx 下载，需 policy:export 权限
  @Get('export')
  @ApiOperation({ summary: '导出保单（Excel，按当前筛选条件）' })
  @RequirePermissions('policy:export')
  async export(@Res() res: Response, @Query() query: QueryPolicyDto) {
    const rows = await this.policiesService.findAllForExport(query);
    const buffer = await buildPolicyWorkbook(rows);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent('保单列表.xlsx')}`,
    );
    res.end(buffer);
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
