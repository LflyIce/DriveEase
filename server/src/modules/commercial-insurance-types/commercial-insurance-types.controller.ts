import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryCommercialInsuranceTypeDto } from './dto/query-commercial-insurance-type.dto';
import { CreateCommercialInsuranceTypeDto } from './dto/create-commercial-insurance-type.dto';
import { CommercialInsuranceTypesService } from './commercial-insurance-types.service';

@ApiTags('commercial-insurance-types')
@Controller('commercial-insurance-types')
export class CommercialInsuranceTypesController {
  constructor(private readonly service: CommercialInsuranceTypesService) {}

  @Get()
  @ApiOperation({ summary: '商业险种列表（分页+关键字+状态）' })
  findMany(@Query() query: QueryCommercialInsuranceTypeDto) {
    return this.service.findMany(query.page, query.pageSize, query.keyword, query.status);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增商业险种' })
  create(@Body() dto: CreateCommercialInsuranceTypeDto) {
    return this.service.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑商业险种' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCommercialInsuranceTypeDto) {
    return this.service.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除商业险种' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOne(id);
  }
}
