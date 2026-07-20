import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  ApproveStockCountDto,
  CreateStockCountDto,
  ListStockCountsQueryDto,
  UpdateStockCountDto,
} from './dto/stock-count.dto';
import { StockCountsService } from './stock-counts.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'stock-count', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Stock Counts')
@ApiBearerAuth()
@Controller('stock-counts')
export class StockCountsController {
  constructor(private readonly stockCountsService: StockCountsService) {}

  @Post()
  @RequirePermissions('stock.adjust')
  @ApiOperation({ summary: 'Create physical stock count (draft)' })
  create(
    @Body() dto: CreateStockCountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.stockCountsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'List stock counts' })
  list(
    @Query() query: ListStockCountsQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.stockCountsService.list(query, actor.id);
  }

  @Get(':id')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Get stock count' })
  getById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.stockCountsService.getById(id, actor.id);
  }

  @Patch(':id')
  @RequirePermissions('stock.adjust')
  @ApiOperation({ summary: 'Update draft stock count' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStockCountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.stockCountsService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Submit stock count (differences require explanation)',
  })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.stockCountsService.submit(id, actor.id);
  }

  @Post(':id/review')
  @RequirePermissions('stock.adjust')
  @ApiOperation({ summary: 'Mark stock count as reviewed' })
  review(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.stockCountsService.review(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('stock.view')
  @ApiOperation({
    summary:
      'Approve stock count (large variances require stock.count.director_approve)',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveStockCountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.stockCountsService.approve(id, actor.id, dto);
  }

  @Post(':id/post')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Post stock adjustments to ledger and create adjustment journal',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.stockCountsService.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('stock.adjust')
  @ApiOperation({ summary: 'Cancel open stock count' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.stockCountsService.cancel(id, actor.id);
  }
}
