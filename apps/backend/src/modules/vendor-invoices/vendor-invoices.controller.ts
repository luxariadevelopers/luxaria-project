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
  ApproveVendorInvoiceDto,
  CreateVendorInvoiceDto,
  ListVendorInvoicesQueryDto,
  RejectMatchingDto,
  UpdateVendorInvoiceDto,
} from './dto/vendor-invoice.dto';
import { VendorInvoicesService } from './vendor-invoices.service';

@ApiTags('Vendor Invoices')
@ApiBearerAuth()
@Controller('vendor-invoices')
export class VendorInvoicesController {
  constructor(private readonly vendorInvoicesService: VendorInvoicesService) {}

  @Post()
  @RequirePermissions('vendor_invoice.create')
  @ApiOperation({ summary: 'Create vendor invoice (draft)' })
  create(
    @Body() dto: CreateVendorInvoiceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorInvoicesService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('vendor_invoice.view')
  @ApiOperation({ summary: 'List vendor invoices' })
  list(@Query() query: ListVendorInvoicesQueryDto) {
    return this.vendorInvoicesService.list(query);
  }

  @Get(':id')
  @RequirePermissions('vendor_invoice.view')
  @ApiOperation({ summary: 'Get vendor invoice' })
  getById(@Param('id') id: string) {
    return this.vendorInvoicesService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('vendor_invoice.create')
  @ApiOperation({ summary: 'Update draft vendor invoice' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVendorInvoiceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorInvoicesService.update(id, dto, actor.id);
  }

  @Post(':id/submit')
  @RequirePermissions('vendor_invoice.create')
  @ApiOperation({ summary: 'Submit vendor invoice' })
  submit(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorInvoicesService.submit(id, actor.id);
  }

  @Post(':id/verify')
  @RequirePermissions('vendor_invoice.verify')
  @ApiOperation({ summary: 'Move invoice to verification' })
  verify(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorInvoicesService.verify(id, actor.id);
  }

  @Post(':id/match')
  @RequirePermissions('vendor_invoice.match')
  @ApiOperation({
    summary:
      'Three-way match PO ↔ GRN ↔ Invoice (material, qty, rate, tax, freight, discount, total)',
  })
  match(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorInvoicesService.match(id, actor.id);
  }

  @Post(':id/reject-matching')
  @RequirePermissions('vendor_invoice.match')
  @ApiOperation({ summary: 'Reject three-way matching result' })
  rejectMatching(
    @Param('id') id: string,
    @Body() dto: RejectMatchingDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorInvoicesService.rejectMatching(id, actor.id, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('vendor_invoice.approve')
  @ApiOperation({
    summary: 'Approve matched invoice (exceptions need a comment)',
  })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveVendorInvoiceDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorInvoicesService.approve(id, actor.id, dto);
  }

  @Post(':id/post')
  @RequirePermissions('vendor_invoice.post')
  @ApiOperation({ summary: 'Post vendor invoice AP journal' })
  post(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorInvoicesService.post(id, actor.id);
  }

  @Post(':id/mark-paid')
  @RequirePermissions('payment.release')
  @ApiOperation({ summary: 'Mark posted invoice as paid' })
  markPaid(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorInvoicesService.markPaid(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('vendor_invoice.create')
  @ApiOperation({ summary: 'Cancel open vendor invoice' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.vendorInvoicesService.cancel(id, actor.id);
  }
}
