import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  FinanceDashboardExportQueryDto,
  FinanceDashboardQueryDto,
} from './dto/finance-dashboard-query.dto';
import { FinanceDashboardExportService } from './finance-dashboard-export.service';
import { FinanceDashboardService } from './finance-dashboard.service';

@ApiTags('Finance Dashboard')
@ApiBearerAuth()
@Controller('finance-dashboard')
export class FinanceDashboardController {
  constructor(
    private readonly financeDashboardService: FinanceDashboardService,
    private readonly exportService: FinanceDashboardExportService,
  ) {}

  @Get('summary')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'Finance dashboard summary (balances, ageing, receivables, approvals, forecast)',
  })
  getSummary(
    @Query() query: FinanceDashboardQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.financeDashboardService.getSummary(query, actor.id);
  }

  @Get('export')
  @RequirePermissions('report.export')
  @ApiOperation({
    summary: 'Export finance dashboard summary as CSV or Excel',
  })
  async export(
    @Query() query: FinanceDashboardExportQueryDto,
    @CurrentUser() actor: AuthUser,
    @Res() res: Response,
  ) {
    const format = query.format ?? 'xlsx';
    const { filename, contentType, buffer } = await this.exportService.export(
      query,
      actor.id,
      format,
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
