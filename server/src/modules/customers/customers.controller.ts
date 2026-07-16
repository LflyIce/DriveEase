import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PaginationDto } from '../../shared/dto/pagination.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: '客户列表（分页+关键字）' })
  findMany(@Query() query: PaginationDto) {
    return this.customersService.findMany(query.page, query.pageSize, query.keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: '客户详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOneOrFail(id);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增客户' })
  @RequirePermissions('customer:create')
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑客户' })
  @RequirePermissions('customer:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCustomerDto) {
    return this.customersService.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除客户' })
  @RequirePermissions('customer:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.deleteOne(id);
  }
}
