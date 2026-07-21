import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CreateVendorPortalQuotationDto } from './dto/vendor-portal.dto';
import { VendorPortalService } from './vendor-portal.service';

/**
 * Minimal vendor self-service portal.
 * Access requires vendor_portal.* permissions AND Vendor.userId == actor.
 */
@GlobalScope()
@ApiTags('Vendor Portal')
@ApiBearerAuth()
@Controller('vendor-portal')
export class VendorPortalController {
  constructor(private readonly vendorPortalService: VendorPortalService) {}

  @Get('rfqs')
  @RequirePermissions('vendor_portal.view')
  @ApiOperation({ summary: 'List issued RFQs where this vendor is invited' })
  listRfqs(@CurrentUser() actor: AuthUser) {
    return this.vendorPortalService.listIssuedRfqs(actor.id);
  }

  @Post('rfqs/:id/quotations')
  @RequirePermissions('vendor_portal.respond')
  @ApiOperation({ summary: 'Create draft quotation response for an issued RFQ' })
  createQuotation(
    @Param('id') id: string,
    @Body() dto: CreateVendorPortalQuotationDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorPortalService.createQuotationForRfq(id, dto, actor.id);
  }

  @Get('purchase-orders')
  @RequirePermissions('vendor_portal.view')
  @ApiOperation({ summary: 'List issued purchase orders for this vendor' })
  listPurchaseOrders(@CurrentUser() actor: AuthUser) {
    return this.vendorPortalService.listPurchaseOrders(actor.id);
  }

  @Post('purchase-orders/:id/accept')
  @RequirePermissions('vendor_portal.respond')
  @ApiOperation({ summary: 'Accept an issued purchase order' })
  acceptPurchaseOrder(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.vendorPortalService.acceptPurchaseOrder(id, actor.id);
  }
}
