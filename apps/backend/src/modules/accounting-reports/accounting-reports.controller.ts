import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { AccountingReportType } from './accounting-reports.constants';
import { AccountingReportsExportService } from './accounting-reports-export.service';
import { AccountingReportsService } from './accounting-reports.service';
import {
  AccountingReportExportQueryDto,
  AccountingReportsQueryDto,
} from './dto/accounting-reports-query.dto';

@ApiTags('Accounting Reports')
@ApiBearerAuth()
@Controller('accounting-reports')
export class AccountingReportsController {
  constructor(
    private readonly reportsService: AccountingReportsService,
    private readonly exportService: AccountingReportsExportService,
  ) {}

  @Get()
  @RequirePermissions('report.view')
  @ApiOperation({ summary: 'List available accounting reports' })
  list() {
    return this.reportsService.listReports();
  }

  @Get(':reportType/export')
  @RequirePermissions('report.export')
  @ApiOperation({ summary: 'Export accounting report as PDF or Excel' })
  async export(
    @Param('reportType') reportType: AccountingReportType,
    @Query() query: AccountingReportExportQueryDto,
    @Res() res: Response,
  ) {
    const { filename, contentType, buffer } = await this.exportService.export(
      reportType,
      query,
      query.format ?? 'xlsx',
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':reportType')
  @RequirePermissions('report.view')
  @ApiOperation({
    summary:
      'Run an accounting report (trial balance, ledgers, ageing, cash flow, etc.)',
  })
  getReport(
    @Param('reportType') reportType: AccountingReportType,
    @Query() query: AccountingReportsQueryDto,
  ) {
    return this.reportsService.getReport(reportType, query);
  }
}
