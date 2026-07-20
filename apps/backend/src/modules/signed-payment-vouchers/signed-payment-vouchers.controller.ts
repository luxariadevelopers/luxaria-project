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
  AttachSignaturesDto,
  CancelSignedPaymentVoucherDto,
  CreateSignedPaymentVoucherDto,
  ListSignedPaymentVouchersQueryDto,
  ReverseSignedPaymentVoucherDto,
  UpdateSignedPaymentVoucherDto,
} from './dto/signed-payment-voucher.dto';
import { SignedPaymentVouchersService } from './signed-payment-vouchers.service';
import { ProjectScoped } from '../project-access/decorators/route-scope.decorator';

@ProjectScoped({
  mode: 'filter',
  resource: { resourceType: 'signed-payment-voucher', idParam: 'id' },
  operation: 'read',
})
@ApiTags('Signed Payment Vouchers')
@ApiBearerAuth()
@Controller('signed-payment-vouchers')
export class SignedPaymentVouchersController {
  constructor(private readonly service: SignedPaymentVouchersService) {}

  @Post()
  @RequirePermissions('payment.release')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
  })
  @ApiOperation({
    summary: 'Create labour / cash-payment voucher draft',
  })
  create(
    @Body() dto: CreateSignedPaymentVoucherDto,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.create(dto, actor.id, idempotencyKey);
  }

  @Get()
  @RequirePermissions('payment.view')
  @ApiOperation({ summary: 'List signed payment vouchers' })
  list(@Query() query: ListSignedPaymentVouchersQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @RequirePermissions('payment.view')
  @ApiOperation({ summary: 'Get signed payment voucher' })
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Update draft / returned voucher' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSignedPaymentVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor.id);
  }

  @Post(':id/signatures')
  @RequirePermissions('payment.release')
  @ApiOperation({
    summary:
      'Attach S3 signature/photo documents and store checksums (blocked after approval)',
  })
  attachSignatures(
    @Param('id') id: string,
    @Body() dto: AttachSignaturesDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.attachSignatures(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Submit voucher for approval' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('payment.approve')
  @ApiOperation({
    summary: 'Approve voucher and generate PDF voucher in S3',
  })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.approve(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('payment.approve')
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Post voucher (Dr Expense / Cr Petty Cash)' })
  post(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.service.post(id, actor.id, idempotencyKey);
  }

  @Post(':id/reverse')
  @RequirePermissions('payment.approve')
  @ApiOperation({
    summary:
      'Reverse posted voucher journal and optionally create replacement draft',
  })
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseSignedPaymentVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.reverse(id, dto, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Cancel non-posted voucher' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSignedPaymentVoucherDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.cancel(id, dto, actor.id);
  }
}
