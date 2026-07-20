import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('Audit Log')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({
    summary: 'Query immutable audit logs',
    description:
      'Filter by user, module, project, action, entity, and date range. No create/update/delete APIs.',
  })
  list(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.list(query);
  }

  @Get(':id')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Get a single audit log entry' })
  getById(@Param('id') id: string) {
    return this.auditLogService.getById(id);
  }
}
