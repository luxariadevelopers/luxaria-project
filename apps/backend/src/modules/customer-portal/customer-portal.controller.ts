import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CustomerPortalService } from './customer-portal.service';
import { RaiseCustomerWarrantyDto } from './dto/customer-portal.dto';

@GlobalScope()
@ApiTags('Customer Portal')
@ApiBearerAuth()
@Controller('customer-portal')
export class CustomerPortalController {
  constructor(private readonly customerPortalService: CustomerPortalService) {}

  @Get('me')
  @RequirePermissions('customer_portal.view')
  @ApiOperation({ summary: 'Linked customer profile for the current user' })
  getMe(@CurrentUser() actor: AuthUser) {
    return this.customerPortalService.getMe(actor);
  }

  @Get('bookings')
  @RequirePermissions('customer_portal.view')
  @ApiOperation({ summary: 'List bookings for the linked customer' })
  getBookings(@CurrentUser() actor: AuthUser) {
    return this.customerPortalService.getBookings(actor);
  }

  @Get('demands')
  @RequirePermissions('customer_portal.view')
  @ApiOperation({ summary: 'List payment demands for the linked customer' })
  getDemands(@CurrentUser() actor: AuthUser) {
    return this.customerPortalService.getDemands(actor);
  }

  @Get('receipts')
  @RequirePermissions('customer_portal.view')
  @ApiOperation({ summary: 'List receipts for the linked customer' })
  getReceipts(@CurrentUser() actor: AuthUser) {
    return this.customerPortalService.getReceipts(actor);
  }

  @Get('warranties')
  @RequirePermissions('customer_portal.view')
  @ApiOperation({ summary: 'List warranty tickets for the linked customer' })
  getWarranties(@CurrentUser() actor: AuthUser) {
    return this.customerPortalService.getWarranties(actor);
  }

  @Post('warranties')
  @RequirePermissions('customer_portal.manage')
  @ApiOperation({ summary: 'Raise a warranty ticket for the linked customer' })
  raiseWarranty(
    @Body() dto: RaiseCustomerWarrantyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.customerPortalService.raiseWarranty(actor, dto);
  }
}
