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
  CreateVendorPaymentDto,
  ListVendorPaymentsQueryDto,
  UpdateVendorPaymentDto,
} from './dto/vendor-payment.dto';
import { VendorPaymentsService } from './vendor-payments.service';

@ApiTags('Vendor Payments')
@ApiBearerAuth()
@Controller('vendor-payments')
export class VendorPaymentsController {
  constructor(private readonly vendorPaymentsService: VendorPaymentsService) {}

  @Post()
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Create vendor payment (draft)' })
  create(
    @Body() dto: CreateVendorPaymentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorPaymentsService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('payment.view')
  @ApiOperation({ summary: 'List vendor payments' })
  list(@Query() query: ListVendorPaymentsQueryDto) {
    return this.vendorPaymentsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('payment.view')
  @ApiOperation({ summary: 'Get vendor payment' })
  getById(@Param('id') id: string) {
    return this.vendorPaymentsService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Update draft vendor payment' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorPaymentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorPaymentsService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Submit for approval (Draft → Approval)' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorPaymentsService.submit(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('payment.approve')
  @ApiOperation({ summary: 'Approve payment (Approval → Released)' })
  approve(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorPaymentsService.approve(id, actor.id);
  }

  @Post(':id/release')
  @RequirePermissions('payment.release')
  @ApiOperation({
    summary: 'Record bank release (requires transaction ID)',
  })
  release(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorPaymentsService.release(id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('payment.approve')
  @ApiOperation({ summary: 'Verify payment (Released → Verified)' })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorPaymentsService.verify(id, actor.id);
  }

  @Post(':id/post')
  @RequirePermissions('payment.approve')
  @ApiOperation({
    summary: 'Post payment journal — Dr Vendor Payable / Cr Bank',
  })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorPaymentsService.post(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Cancel open vendor payment' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorPaymentsService.cancel(id, actor.id);
  }
}
