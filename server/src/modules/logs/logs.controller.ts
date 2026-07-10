import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { QueryLogDto } from './dto/query-log.dto';
import { LogsService } from './logs.service';

@ApiTags('logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @ApiOperation({ summary: '操作日志列表（分页）' })
  findMany(@Query() query: QueryLogDto) {
    return this.logsService.findMany(query.page, query.pageSize, query.operator, query.action);
  }
}
