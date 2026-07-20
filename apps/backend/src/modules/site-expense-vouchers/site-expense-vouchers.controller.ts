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
  CancelSiteExpenseVoucherDto,
  CreateSiteExpenseVoucherDto,
  ListSiteExpenseVouchersQueryDto,
  RejectSiteExpenseVoucherDto,
  ReturnSiteExpenseVoucherDto,
  UpdateSiteExpenseVoucherDto,
} from './dto/site-expense-voucher.dto';
import { SiteExpenseVouchersService } from './site-expense-vouchers.service';

@ApiTags('Site Expense Vouchers')
@ApiBearerAuth()
@Controller('site-expense-vouchers')
export class SiteExpenseVouchersController {
  constructor(private readonly service: SiteExpenseVouchersService) {}

  @Post()
  @RequirePermissions('expense.create')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Stable client key for create retries',
  })
  @ApiOperation({ summary: 'Create site expense voucher (draft)' })
  create(
    @Body() dto: CreateSiteExpenseVoucherDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('expense.view')
  @ApiOperation({ summary: 'List site expense vouchers' })
  list(@Query() query: ListSiteExpenseVouchersQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('expense.view')
  @ApiOperation({ summary: 'Get site expense voucher' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Update draft / returned voucher' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteExpenseVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Submit voucher (draft → submitted)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Verify voucher (submitted → verified)' })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.verify(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Approve voucher (verified → approved)' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('expense.post')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Optional key for post retries (defaults to sev-post:<voucherId>)',
  })
  @ApiOperation({
    summary: 'Post voucher — Dr Expense/WIP / Cr Petty Cash',
  })
  post(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.post(id, actor.id, idempotencyKey);
  }

  @Post(':id/reject')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Reject submitted or verified voucher' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectSiteExpenseVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reject(id, dto, actor.id);
  }

  @Post(':id/return')
  @RequirePermissions('expense.approve')
  @ApiOperation({ summary: 'Return voucher for correction' })
  returnForCorrection(
    @Param('id') id: string,
    @Body() dto: ReturnSiteExpenseVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.returnForCorrection(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('expense.create')
  @ApiOperation({ summary: 'Cancel non-posted voucher' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSiteExpenseVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(id, dto, actor.id);
  }
}
