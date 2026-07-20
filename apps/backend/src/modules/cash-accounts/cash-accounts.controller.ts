import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CashAccountsService } from './cash-accounts.service';
import {
  AssignCustodianDto,
  CashLedgerQueryDto,
  CloseCashAccountDto,
  ConfirmHandoverDto,
  CreateCashAccountDto,
  InitiateCustodianTransferDto,
  ListCashAccountsQueryDto,
} from './dto/cash-account.dto';

@ApiTags('Cash Accounts')
@ApiBearerAuth()
@Controller('cash-accounts')
export class CashAccountsController {
  constructor(private readonly service: CashAccountsService) {}

  @Post()
  @RequirePermissions('cash.manage')
  @ApiOperation({ summary: 'Create site cash / petty-cash account' })
  create(@Body() dto: CreateCashAccountDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('cash.view')
  @ApiOperation({ summary: 'List cash accounts' })
  list(@Query() query: ListCashAccountsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('cash.view')
  @ApiOperation({ summary: 'Get cash account' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':id/balance')
  @RequirePermissions('cash.view')
  @ApiOperation({ summary: 'View current cash balance' })
  balance(@Param('id') id: string) {
    return this.service.getBalance(id);
  }

  @Get(':id/ledger')
  @RequirePermissions('cash.view')
  @ApiOperation({ summary: 'View cash transaction ledger' })
  ledger(@Param('id') id: string, @Query() query: CashLedgerQueryDto) {
    return this.service.getLedger(id, query);
  }

  @Post(':id/assign-custodian')
  @RequirePermissions('cash.manage')
  @ApiOperation({
    summary:
      'Assign custodian (initial only); changes require transfer + handover confirmation',
  })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignCustodianDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.assignCustodian(id, dto, actor.id);
  }

  @Post(':id/transfer-custodian')
  @RequirePermissions('cash.manage')
  @ApiOperation({ summary: 'Initiate custodian transfer (handover)' })
  transfer(
    @Param('id') id: string,
    @Body() dto: InitiateCustodianTransferDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.initiateCustodianTransfer(id, dto, actor.id);
  }

  @Post(':id/confirm-handover')
  @RequirePermissions('cash.view')
  @ApiOperation({
    summary:
      'Confirm custodian handover (outgoing and incoming custodians each confirm)',
  })
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmHandoverDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.confirmHandover(id, actor.id, dto);
  }

  @Post(':id/cancel-handover')
  @RequirePermissions('cash.manage')
  @ApiOperation({ summary: 'Cancel pending custodian handover' })
  cancelHandover(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancelHandover(id, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('cash.manage')
  @ApiOperation({ summary: 'Close cash account (zero balance required)' })
  close(
    @Param('id') id: string,
    @Body() dto: CloseCashAccountDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.close(id, actor.id, dto);
  }
}
