import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { SiteExecutionReportsService } from './site-execution-reports.service';

class SeReportQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 200 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number;
}

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Site Execution Reports')
@ApiBearerAuth()
@Controller('site-execution/reports')
export class SiteExecutionReportsController {
  constructor(private readonly service: SiteExecutionReportsService) {}

  @Get('dpr-register')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'DPR register (tabular)' })
  dprRegister(@Query() query: SeReportQueryDto) {
    return this.service.dprRegister(query);
  }

  @Get('labour')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Labour attendance report (tabular)' })
  labour(@Query() query: SeReportQueryDto) {
    return this.service.labour(query);
  }

  @Get('equipment-utilization')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary: 'Equipment utilization report (empty if equipment module missing)',
  })
  equipmentUtilization(@Query() query: SeReportQueryDto) {
    return this.service.equipmentUtilization(query);
  }

  @Get('material-consumption')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Material consumption from stock ledger' })
  materialConsumption(@Query() query: SeReportQueryDto) {
    return this.service.materialConsumption(query);
  }

  @Get('daily-progress')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Daily progress summary (tabular)' })
  dailyProgress(@Query() query: SeReportQueryDto) {
    return this.service.dailyProgress(query);
  }

  @Get('delay')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Delay report from DPR (+ site_issues when present)' })
  delay(@Query() query: SeReportQueryDto) {
    return this.service.delay(query);
  }

  @Get('quality')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary: 'Site quality report (site_quality or DPR qualityIssues fallback)',
  })
  quality(@Query() query: SeReportQueryDto) {
    return this.service.quality(query);
  }

  @Get('safety')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary: 'Safety / HSE report (empty module → DPR safetyIssues fallback)',
  })
  safety(@Query() query: SeReportQueryDto) {
    return this.service.safety(query);
  }

  @Get('productivity')
  @RequirePermissions('dashboard.view')
  @ApiOperation({ summary: 'Daily productivity (BOQ qty / labour)' })
  productivity(@Query() query: SeReportQueryDto) {
    return this.service.productivity(query);
  }
}
