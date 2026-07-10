import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../shared/dto/pagination.dto';
import { CreateCompulsoryInsuranceTypeDto } from './dto/create-compulsory-insurance-type.dto';
import { CompulsoryInsuranceTypesService } from './compulsory-insurance-types.service';

@ApiTags('compulsory-insurance-types')
@Controller('compulsory-insurance-types')
export class CompulsoryInsuranceTypesController {
  constructor(private readonly service: CompulsoryInsuranceTypesService) {}

  @Get()
  @ApiOperation({ summary: '交强险种列表（分页+关键字）' })
  findMany(@Query() query: PaginationDto) {
    return this.service.findMany(query.page, query.pageSize, query.keyword);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增交强险种' })
  create(@Body() dto: CreateCompulsoryInsuranceTypeDto) {
    return this.service.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑交强险种' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCompulsoryInsuranceTypeDto) {
    return this.service.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除交强险种' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteOne(id);
  }
}
