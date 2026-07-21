import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { SiteExecutionDashboardService } from './site-execution-dashboard.service';

class SeDashboardQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Inclusive range start (ISO date)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive range end (ISO date)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Site Execution Dashboard')
@ApiBearerAuth()
@Controller('site-execution/dashboard')
export class SiteExecutionDashboardController {
  constructor(private readonly service: SiteExecutionDashboardService) {}

  @Get('pm')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'PM site-execution KPIs (DPR completion, labour, equipment, materials, delays, issues)',
  })
  pm(@Query() query: SeDashboardQueryDto) {
    return this.service.getPmView(query);
  }

  @Get('director')
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'Director site-execution KPIs (physical/financial progress, productivity, critical issues)',
  })
  director(@Query() query: SeDashboardQueryDto) {
    return this.service.getDirectorView(query);
  }
}
