import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ContractorDashboardService } from './contractor-dashboard.service';

class ContractorDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;

  @ApiPropertyOptional({
    description: 'Compliance expiry window in days (default 30)',
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(365)
  withinDays?: number;
}

@GlobalScope()
@ApiTags('Contractor Dashboard')
@ApiBearerAuth()
@Controller('contractor/dashboard')
export class ContractorDashboardController {
  constructor(private readonly service: ContractorDashboardService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  @ApiOperation({
    summary:
      'Contractor ops KPIs (open WOs, pending bills, retention, payable, compliance)',
  })
  kpis(@Query() query: ContractorDashboardQueryDto) {
    return this.service.getKpis(query);
  }
}
