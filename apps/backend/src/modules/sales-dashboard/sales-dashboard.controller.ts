import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsMongoId, IsOptional } from 'class-validator';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { SalesDashboardService } from './sales-dashboard.service';

class SalesDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  companyId?: string;
}

@GlobalScope()
@ApiTags('Sales Dashboard')
@ApiBearerAuth()
@Controller('sales/dashboard')
export class SalesDashboardController {
  constructor(private readonly service: SalesDashboardService) {}

  @Get()
  @RequirePermissions('sales_report.view')
  @ApiOperation({
    summary:
      'Sales KPI dashboard (leads, bookings, collections, cancellations)',
  })
  summary(@Query() query: SalesDashboardQueryDto) {
    return this.service.getSummary(query);
  }
}
