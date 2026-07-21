import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { InventoryDashboardService } from './inventory-dashboard.service';

class InventoryDashboardQueryDto {
  @ApiProperty()
  @IsMongoId()
  projectId!: string;
}

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Inventory Dashboard')
@ApiBearerAuth()
@Controller('inventory/dashboard')
export class InventoryDashboardController {
  constructor(private readonly service: InventoryDashboardService) {}

  @Get()
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Inventory KPI dashboard for a project' })
  summary(@Query() query: InventoryDashboardQueryDto) {
    return this.service.getSummary(query.projectId);
  }
}
