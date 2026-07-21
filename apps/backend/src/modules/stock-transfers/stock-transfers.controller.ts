import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateStockTransferDto,
  ListStockTransfersQueryDto,
} from './dto/stock-transfer.dto';
import { StockTransfersService } from './stock-transfers.service';

@ProjectScoped({ mode: 'filter', operation: 'read' })
@ApiTags('Stock Transfers')
@ApiBearerAuth()
@Controller('stock-transfers')
export class StockTransfersController {
  constructor(private readonly service: StockTransfersService) {}

  @Post()
  @RequirePermissions('stock.transfer')
  @ApiOperation({ summary: 'Create stock transfer (draft)' })
  create(
    @Body() dto: CreateStockTransferDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'List stock transfers' })
  list(@Query() query: ListStockTransfersQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Get stock transfer' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/submit')
  @RequirePermissions('stock.transfer')
  @ApiOperation({ summary: 'Submit stock transfer' })
  submit(@Param('id') id: string) {
    return this.service.submit(id);
  }

  @Post(':id/post')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Post transfer — writes transfer_out + transfer_in ledger rows',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('stock.transfer')
  @ApiOperation({ summary: 'Cancel draft/submitted transfer' })
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
