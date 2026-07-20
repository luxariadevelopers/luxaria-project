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
  ApprovePurchaseOrderDto,
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
  ReceivePurchaseOrderDto,
  RejectPurchaseOrderDto,
  RevisePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Create purchase order (draft)' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() actor: AuthUser) {
    return this.purchaseOrdersService.create(dto, actor.id);
  }

  @Get()
  @RequirePermissions('purchase.view')
  @ApiOperation({ summary: 'List / search purchase orders' })
  list(@Query() query: ListPurchaseOrdersQueryDto) {
    return this.purchaseOrdersService.list(query);
  }

  @Get(':id/balance')
  @RequirePermissions('purchase.view')
  @ApiOperation({ summary: 'Get purchase order open balance' })
  getBalance(@Param('id') id: string) {
    return this.purchaseOrdersService.getBalance(id);
  }

  @Get(':id')
  @RequirePermissions('purchase.view')
  @ApiOperation({ summary: 'Get purchase order' })
  getById(@Param('id') id: string) {
    return this.purchaseOrdersService.getById(id);
  }

  @Patch(':id')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Update draft purchase order' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseOrdersService.update(id, dto, actor.id);
  }

  @Post(':id/submit-approval')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Submit purchase order for approval' })
  submitForApproval(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseOrdersService.submitForApproval(id, actor.id);
  }

  @Post(':id/approve')
  @RequirePermissions('purchase.approve')
  @ApiOperation({ summary: 'Approve purchase order (issues when fully approved)' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePurchaseOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseOrdersService.approve(id, dto, actor.id);
  }

  @Post(':id/reject')
  @RequirePermissions('purchase.approve')
  @ApiOperation({ summary: 'Reject purchase order' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPurchaseOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseOrdersService.reject(id, dto, actor.id);
  }

  @Post(':id/revise')
  @RequirePermissions('purchase.order')
  @ApiOperation({
    summary:
      'Revise issued PO (versioning — supersedes previous; new draft needs re-approval)',
  })
  revise(
    @Param('id') id: string,
    @Body() dto: RevisePurchaseOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseOrdersService.revise(id, dto, actor.id);
  }

  @Post(':id/receive')
  @RequirePermissions('grn.create')
  @ApiOperation({
    summary: 'Record receipt against PO (enforces over-delivery tolerance)',
  })
  receive(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.purchaseOrdersService.recordReceipt(id, dto, actor.id);
  }

  @Post(':id/close')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Close purchase order' })
  close(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseOrdersService.close(id, actor.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('purchase.order')
  @ApiOperation({ summary: 'Cancel purchase order' })
  cancel(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseOrdersService.cancel(id, actor.id);
  }

  @Post(':id/export-pdf')
  @RequirePermissions('purchase.view')
  @ApiOperation({ summary: 'Generate purchase order PDF' })
  exportPdf(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.purchaseOrdersService.exportPdf(id, actor.id);
  }
}
