import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { InventoryReportsService } from './inventory-reports.service';

class ReportBaseQuery {
  @ApiPropertyOptional()
  @IsMongoId()
  projectId!: string;
}

class LedgerReportQuery extends ReportBaseQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

class BinCardQuery extends ReportBaseQuery {
  @ApiPropertyOptional()
  @IsMongoId()
  materialId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
}

class DeadStockQuery extends ReportBaseQuery {
  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(3650)
  days?: number;
}

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Inventory Reports')
@ApiBearerAuth()
@Controller('inventory/reports')
export class InventoryReportsController {
  constructor(private readonly service: InventoryReportsService) {}

  @Get('stock-ledger')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Stock ledger report (reconciles to immutable ledger)' })
  stockLedger(@Query() query: LedgerReportQuery) {
    return this.service.stockLedger(query);
  }

  @Get('bin-card')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Bin card for material / location' })
  binCard(@Query() query: BinCardQuery) {
    return this.service.binCard(query);
  }

  @Get('valuation')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Stock valuation from cost layers' })
  valuation(@Query() query: ReportBaseQuery) {
    return this.service.valuation(query.projectId);
  }

  @Get('abc')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'ABC analysis' })
  abc(@Query() query: ReportBaseQuery) {
    return this.service.abcAnalysis(query.projectId);
  }

  @Get('ageing')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Stock ageing report' })
  ageing(@Query() query: ReportBaseQuery) {
    return this.service.ageing(query.projectId);
  }

  @Get('reorder')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Reorder report' })
  reorder(@Query() query: ReportBaseQuery) {
    return this.service.reorder(query.projectId);
  }

  @Get('dead-stock')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Dead stock report' })
  deadStock(@Query() query: DeadStockQuery) {
    return this.service.deadStock(query.projectId, query.days ?? 90);
  }

  @Get('warehouse-summary')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Warehouse / location summary' })
  warehouseSummary(@Query() query: ReportBaseQuery) {
    return this.service.warehouseSummary(query.projectId);
  }

  @Get('consumption')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Material consumption report' })
  consumption(@Query() query: LedgerReportQuery) {
    return this.service.consumption(query.projectId, query.from, query.to);
  }

  @Get('material-movement')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Material movement (alias of stock ledger)' })
  materialMovement(@Query() query: LedgerReportQuery) {
    return this.service.stockLedger(query);
  }
}
