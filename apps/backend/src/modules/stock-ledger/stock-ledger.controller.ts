import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  GetStockBalanceQueryDto,
  ListStockLedgerQueryDto,
  PostStockLedgerEntryDto,
  ReverseStockLedgerEntryDto,
} from './dto/stock-ledger.dto';
import { StockLedgerService } from './stock-ledger.service';

@ApiTags('Stock Ledger')
@ApiBearerAuth()
@Controller('stock-ledger')
export class StockLedgerController {
  constructor(private readonly stockLedgerService: StockLedgerService) {}

  @Post()
  @RequirePermissions('stock.adjust')
  @ApiOperation({ summary: 'Post immutable stock ledger entry' })
  post(
    @Body() dto: PostStockLedgerEntryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.stockLedgerService.post(dto, actor.id);
  }

  @Post(':id/reverse')
  @RequirePermissions('stock.adjust')
  @ApiOperation({
    summary: 'Correct a ledger entry by posting a reversal (immutable)',
  })
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseStockLedgerEntryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.stockLedgerService.reverse(id, actor.id, dto);
  }

  @Get('balance')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Get calculated stock balance' })
  getBalance(@Query() query: GetStockBalanceQueryDto) {
    return this.stockLedgerService.getBalance(query);
  }

  @Get()
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'List stock ledger entries' })
  list(@Query() query: ListStockLedgerQueryDto) {
    return this.stockLedgerService.list(query);
  }

  @Get(':id')
  @RequirePermissions('stock.view')
  @ApiOperation({ summary: 'Get stock ledger entry' })
  getById(@Param('id') id: string) {
    return this.stockLedgerService.getById(id);
  }
}
