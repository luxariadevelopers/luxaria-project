import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ConstructionReportType } from './construction-reports.constants';
import { ConstructionReportsExportService } from './construction-reports-export.service';
import { ConstructionReportsService } from './construction-reports.service';
import {
  ConstructionReportExportQueryDto,
  ConstructionReportsQueryDto,
} from './dto/construction-reports-query.dto';

@ApiTags('Construction Reports')
@ApiBearerAuth()
@Controller('construction-reports')
export class ConstructionReportsController {
  constructor(
    private readonly reportsService: ConstructionReportsService,
    private readonly exportService: ConstructionReportsExportService,
  ) {}

  @Get()
  @RequirePermissions('report.view')
  @ApiOperation({ summary: 'List construction management reports' })
  list() {
    return this.reportsService.listReports();
  }

  @Get(':reportType/export')
  @RequirePermissions('report.export')
  @ApiOperation({
    summary: 'Export construction report as PDF or Excel',
  })
  async export(
    @Param('reportType') reportType: ConstructionReportType,
    @Query() query: ConstructionReportExportQueryDto,
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
      'Run a construction management report (BOQ, stock, labour, DPR, etc.)',
  })
  getReport(
    @Param('reportType') reportType: ConstructionReportType,
    @Query() query: ConstructionReportsQueryDto,
  ) {
    return this.reportsService.getReport(reportType, query);
  }
}
