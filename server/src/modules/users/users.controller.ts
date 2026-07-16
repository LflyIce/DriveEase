import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: '用户列表（分页+关键字+角色+状态）' })
  findMany(@Query() query: QueryUserDto) {
    return this.usersService.findMany(query.page, query.pageSize, query.keyword, query.role, query.status);
  }

  @Get(':id')
  @ApiOperation({ summary: '用户详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneOrFail(id);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '新增用户' })
  @RequirePermissions('user:create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createOne(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑用户' })
  @RequirePermissions('user:update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.updateOne(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  @RequirePermissions('user:delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteOne(id);
  }
}
