import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../shared/dto/pagination.dto';
import { CreateInsuranceCompanyDto } from './dto/create-insurance-company.dto';
import { InsuranceCompaniesService } from './insurance-companies.service';

@ApiTags('insurance-companies')
@Controller('insurance-companies')
export class InsuranceCompaniesController {
  constructor(private readonly service: InsuranceCompaniesService) {}

  @Get()
  @ApiOperation({ summary: '保险公司列表（分页+关键字）' })
  findMany(@Query() query: PaginationDto) {
    return this.service.findMany(query.page, query.pageSize, query.keyword);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增保险公司' })
  create(@Body() dto: CreateInsuranceCompanyDto) {
    return this.service.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑保险公司' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateInsuranceCompanyDto) {
    return this.service.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除保险公司' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOne(id);
  }
}
