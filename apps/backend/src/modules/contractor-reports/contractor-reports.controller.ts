import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
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
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ContractorReportsService } from './contractor-reports.service';

class CtrReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

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

@GlobalScope()
@ApiTags('Contractor Reports')
@ApiBearerAuth()
@Controller('contractor/reports')
export class ContractorReportsController {
  constructor(private readonly service: ContractorReportsService) {}

  @Get('contractors')
  @RequirePermissions('contractor_report.view')
  @ApiOperation({ summary: 'Contractor master register (tabular)' })
  contractors(@Query() query: CtrReportQueryDto) {
    return this.service.contractorsRegister(query);
  }

  @Get('work-orders')
  @RequirePermissions('contractor_report.view')
  @ApiOperation({
    summary: 'Work order summary (empty-safe if work_orders missing)',
  })
  workOrders(@Query() query: CtrReportQueryDto) {
    return this.service.workOrderSummary(query);
  }

  @Get('ra-register')
  @RequirePermissions('contractor_report.view')
  @ApiOperation({ summary: 'Running-account bill register' })
  raRegister(@Query() query: CtrReportQueryDto) {
    return this.service.raRegister(query);
  }

  @Get('retention')
  @RequirePermissions('contractor_report.view')
  @ApiOperation({
    summary:
      'Retention register (contractor_retentions or RA bill fallback)',
  })
  retention(@Query() query: CtrReportQueryDto) {
    return this.service.retentionRegister(query);
  }

  @Get('recoveries')
  @RequirePermissions('contractor_report.view')
  @ApiOperation({
    summary:
      'Recoveries register (contractor_recoveries or RA bill fallback)',
  })
  recoveries(@Query() query: CtrReportQueryDto) {
    return this.service.recoveriesRegister(query);
  }

  @Get('status')
  @RequirePermissions('contractor_report.view')
  @ApiOperation({ summary: 'Suspended / blacklisted contractor register' })
  status(@Query() query: CtrReportQueryDto) {
    return this.service.statusRegister(query);
  }
}
