import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { GlobalScope } from '../project-access/decorators/route-scope.decorator';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import {
  CreateCatalogItemDto,
  CreateDeliveryTermDto,
  CreatePaymentTermDto,
  CreatePreferredVendorDto,
  CreateTaxRuleDto,
  CreateVendorPriceListDto,
  ListProcurementMastersQueryDto,
  UpdateCatalogItemDto,
  UpdateDeliveryTermDto,
  UpdatePaymentTermDto,
  UpdatePreferredVendorDto,
  UpdateTaxRuleDto,
  UpdateVendorPriceListDto,
} from './dto/procurement-master.dto';
import { ProcurementMastersService } from './procurement-masters.service';
import { ProcurementMasterStatus } from './schemas/procurement-master-status';

@GlobalScope()
@ApiTags('Procurement Masters')
@ApiBearerAuth()
@Controller('procurement-masters')
export class ProcurementMastersController {
  constructor(private readonly service: ProcurementMastersService) {}

  private companyId(actor: AuthUser): string {
    if (!actor.companyId) {
      throw new ForbiddenException('Authenticated company context required');
    }
    return actor.companyId;
  }

  @Post('seed-defaults')
  @RequirePermissions('procurement_master.manage')
  @ApiOperation({
    summary:
      'Seed default payment terms, delivery terms, and tax rules (idempotent)',
  })
  seedDefaults(@CurrentUser() actor: AuthUser) {
    return this.service.seedDefaults(this.companyId(actor), actor.id);
  }

  // ─── purchase categories ───────────────────────────────────────────────

  @Post('purchase-categories')
  @RequirePermissions('procurement_master.manage')
  createPurchaseCategory(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createCatalog(
      'purchase-categories',
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('purchase-categories')
  @RequirePermissions('procurement_master.view')
  listPurchaseCategories(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listCatalog(
      'purchase-categories',
      this.companyId(actor),
      query,
    );
  }

  @Get('purchase-categories/:id')
  @RequirePermissions('procurement_master.view')
  getPurchaseCategory(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getCatalog(
      'purchase-categories',
      id,
      this.companyId(actor),
    );
  }

  @Patch('purchase-categories/:id')
  @RequirePermissions('procurement_master.manage')
  updatePurchaseCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateCatalog(
      'purchase-categories',
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Post('purchase-categories/:id/activate')
  @RequirePermissions('procurement_master.manage')
  activatePurchaseCategory(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setCatalogStatus(
      'purchase-categories',
      id,
      ProcurementMasterStatus.Active,
      this.companyId(actor),
      actor.id,
    );
  }

  @Post('purchase-categories/:id/deactivate')
  @RequirePermissions('procurement_master.manage')
  deactivatePurchaseCategory(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setCatalogStatus(
      'purchase-categories',
      id,
      ProcurementMasterStatus.Inactive,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('purchase-categories/:id')
  @RequirePermissions('procurement_master.manage')
  removePurchaseCategory(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removeCatalog(
      'purchase-categories',
      id,
      this.companyId(actor),
      actor.id,
    );
  }

  // ─── material categories ───────────────────────────────────────────────

  @Post('material-categories')
  @RequirePermissions('material.manage')
  createMaterialCategory(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createCatalog(
      'material-categories',
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('material-categories')
  @RequirePermissions('material.view')
  listMaterialCategories(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listCatalog(
      'material-categories',
      this.companyId(actor),
      query,
    );
  }

  @Patch('material-categories/:id')
  @RequirePermissions('material.manage')
  updateMaterialCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateCatalog(
      'material-categories',
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('material-categories/:id')
  @RequirePermissions('material.manage')
  removeMaterialCategory(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removeCatalog(
      'material-categories',
      id,
      this.companyId(actor),
      actor.id,
    );
  }

  // ─── vendor categories ─────────────────────────────────────────────────

  @Post('vendor-categories')
  @RequirePermissions('vendor.manage')
  createVendorCategory(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createCatalog(
      'vendor-categories',
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('vendor-categories')
  @RequirePermissions('vendor.view')
  listVendorCategories(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listCatalog(
      'vendor-categories',
      this.companyId(actor),
      query,
    );
  }

  @Patch('vendor-categories/:id')
  @RequirePermissions('vendor.manage')
  updateVendorCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateCatalog(
      'vendor-categories',
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('vendor-categories/:id')
  @RequirePermissions('vendor.manage')
  removeVendorCategory(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removeCatalog(
      'vendor-categories',
      id,
      this.companyId(actor),
      actor.id,
    );
  }

  // ─── payment terms ─────────────────────────────────────────────────────

  @Post('payment-terms')
  @RequirePermissions('procurement_master.manage')
  createPaymentTerm(
    @Body() dto: CreatePaymentTermDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createPaymentTerm(
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('payment-terms')
  @RequirePermissions('procurement_master.view')
  listPaymentTerms(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listPaymentTerms(this.companyId(actor), query);
  }

  @Patch('payment-terms/:id')
  @RequirePermissions('procurement_master.manage')
  updatePaymentTerm(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTermDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updatePaymentTerm(
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('payment-terms/:id')
  @RequirePermissions('procurement_master.manage')
  removePaymentTerm(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.removePaymentTerm(id, this.companyId(actor), actor.id);
  }

  // ─── delivery terms ────────────────────────────────────────────────────

  @Post('delivery-terms')
  @RequirePermissions('procurement_master.manage')
  createDeliveryTerm(
    @Body() dto: CreateDeliveryTermDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createDeliveryTerm(
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('delivery-terms')
  @RequirePermissions('procurement_master.view')
  listDeliveryTerms(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listDeliveryTerms(this.companyId(actor), query);
  }

  @Patch('delivery-terms/:id')
  @RequirePermissions('procurement_master.manage')
  updateDeliveryTerm(
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryTermDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateDeliveryTerm(
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('delivery-terms/:id')
  @RequirePermissions('procurement_master.manage')
  removeDeliveryTerm(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.removeDeliveryTerm(
      id,
      this.companyId(actor),
      actor.id,
    );
  }

  // ─── tax rules ─────────────────────────────────────────────────────────

  @Post('tax-rules')
  @RequirePermissions('procurement_master.manage')
  createTaxRule(
    @Body() dto: CreateTaxRuleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createTaxRule(dto, this.companyId(actor), actor.id);
  }

  @Get('tax-rules')
  @RequirePermissions('procurement_master.view')
  listTaxRules(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listTaxRules(this.companyId(actor), query);
  }

  @Patch('tax-rules/:id')
  @RequirePermissions('procurement_master.manage')
  updateTaxRule(
    @Param('id') id: string,
    @Body() dto: UpdateTaxRuleDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateTaxRule(
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('tax-rules/:id')
  @RequirePermissions('procurement_master.manage')
  removeTaxRule(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.removeTaxRule(id, this.companyId(actor), actor.id);
  }

  // ─── preferred vendors ─────────────────────────────────────────────────

  @Post('preferred-vendors')
  @RequirePermissions('vendor.manage')
  createPreferredVendor(
    @Body() dto: CreatePreferredVendorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createPreferredVendor(
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('preferred-vendors')
  @RequirePermissions('vendor.view')
  listPreferredVendors(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listPreferredVendors(this.companyId(actor), query);
  }

  @Patch('preferred-vendors/:id')
  @RequirePermissions('vendor.manage')
  updatePreferredVendor(
    @Param('id') id: string,
    @Body() dto: UpdatePreferredVendorDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updatePreferredVendor(
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('preferred-vendors/:id')
  @RequirePermissions('vendor.manage')
  removePreferredVendor(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removePreferredVendor(
      id,
      this.companyId(actor),
      actor.id,
    );
  }

  // ─── vendor price lists ────────────────────────────────────────────────

  @Post('vendor-price-lists')
  @RequirePermissions('vendor.manage')
  createVendorPriceList(
    @Body() dto: CreateVendorPriceListDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.createVendorPriceList(
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Get('vendor-price-lists')
  @RequirePermissions('vendor.view')
  listVendorPriceLists(
    @Query() query: ListProcurementMastersQueryDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.listVendorPriceLists(this.companyId(actor), query);
  }

  @Patch('vendor-price-lists/:id')
  @RequirePermissions('vendor.manage')
  updateVendorPriceList(
    @Param('id') id: string,
    @Body() dto: UpdateVendorPriceListDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.updateVendorPriceList(
      id,
      dto,
      this.companyId(actor),
      actor.id,
    );
  }

  @Delete('vendor-price-lists/:id')
  @RequirePermissions('vendor.manage')
  removeVendorPriceList(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.removeVendorPriceList(
      id,
      this.companyId(actor),
      actor.id,
    );
  }
}
