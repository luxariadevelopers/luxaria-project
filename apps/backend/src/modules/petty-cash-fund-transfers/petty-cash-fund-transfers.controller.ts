import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CancelPettyCashFundTransferDto,
  CreatePettyCashFundTransferDto,
  ListPettyCashFundTransfersQueryDto,
  UpdatePettyCashFundTransferDto,
} from './dto/petty-cash-fund-transfer.dto';
import { PettyCashFundTransfersService } from './petty-cash-fund-transfers.service';

@ApiTags('Petty Cash Fund Transfers')
@ApiBearerAuth()
@Controller('petty-cash-fund-transfers')
export class PettyCashFundTransfersController {
  constructor(private readonly service: PettyCashFundTransfersService) {}

  @Post()
  @RequirePermissions('petty_cash.fund')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Stable client key for create retries',
  })
  @ApiOperation({ summary: 'Create petty-cash fund transfer (draft)' })
  create(
    @Body() dto: CreatePettyCashFundTransferDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('petty_cash.view')
  @ApiOperation({ summary: 'List petty-cash fund transfers' })
  list(@Query() query: ListPettyCashFundTransfersQueryDto) {
    return this.service.list(query);
  }

  @Get('request/:requestId/balance')
  @RequirePermissions('petty_cash.view')
  @ApiOperation({
    summary: 'Remaining approved balance available for fund transfers',
  })
  getApprovedRequestBalance(@Param('requestId') requestId: string) {
    return this.service.getApprovedRequestBalance(requestId);
  }

  @Get(':id')
  @RequirePermissions('petty_cash.view')
  @ApiOperation({ summary: 'Get petty-cash fund transfer' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('petty_cash.fund')
  @ApiOperation({ summary: 'Update draft fund transfer' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashFundTransferDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('petty_cash.fund')
  @ApiOperation({ summary: 'Verify fund transfer (draft → verified)' })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.verify(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('petty_cash.fund')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Optional key for post retries (defaults to pcft-post:<transferId>)',
  })
  @ApiOperation({
    summary:
      'Post fund transfer — Dr Site Petty Cash / Cr Bank via journal service',
  })
  post(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.post(id, actor.id, idempotencyKey);
  }

  @Post(':id/cancel')
  @RequirePermissions('petty_cash.fund')
  @ApiOperation({ summary: 'Cancel draft or verified fund transfer' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelPettyCashFundTransferDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(id, dto, actor.id);
  }
}
