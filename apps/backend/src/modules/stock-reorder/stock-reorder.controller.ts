import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  EvaluateStockReorderDto,
  ForecastQueryDto,
  ListStockReorderAlertsQueryDto,
} from './dto/stock-reorder.dto';
import { StockReorderScheduler } from './stock-reorder.scheduler';
import { StockReorderService } from './stock-reorder.service';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  operation: 'read',
})
@ApiTags('Stock Reorder')
@ApiBearerAuth()
@Controller('stock-reorder')
export class StockReorderController {
  constructor(
    private readonly stockReorderService: StockReorderService,
    private readonly stockReorderScheduler: StockReorderScheduler,
  ) {}

  @Get('forecast')
  @RequirePermissions('stock.view')
  @ApiOperation({
    summary:
      'Compute reorder / stock-out forecast for project materials (on-demand)',
  })
  getForecast(@Query() query: ForecastQueryDto) {
    return this.stockReorderService.getForecast(query);
  }

  @Get('alerts')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'List persisted stock reorder alerts' })
  listAlerts(@Query() query: ListStockReorderAlertsQueryDto) {
    return this.stockReorderService.listAlerts(query);
  }

  @Post('evaluate')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary:
      'Run reorder evaluation now (queues BullMQ job when Redis enabled)',
  })
  async evaluate(@Body() dto: EvaluateStockReorderDto) {
    const outcome = await this.stockReorderScheduler.enqueueOrRun({
      projectId: dto.projectId,
      materialId: dto.materialId,
      lookbackDays: dto.lookbackDays,
      asOf: dto.asOf,
    });
    return createSuccessResponse(
      outcome,
      outcome.mode === 'queued'
        ? 'Stock reorder evaluation queued'
        : 'Stock reorder evaluation completed',
    );
  }
}
