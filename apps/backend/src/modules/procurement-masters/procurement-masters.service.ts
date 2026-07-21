import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import type {
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
import {
  toPublicCatalogItem,
  toPublicDeliveryTerm,
  toPublicPaymentTerm,
  toPublicPreferredVendor,
  toPublicTaxRule,
  toPublicVendorPriceList,
} from './procurement-masters.mapper';
import {
  DEFAULT_DELIVERY_TERMS,
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_TAX_RULES,
} from './procurement-masters.seed';
import {
  DeliveryTerm,
} from './schemas/delivery-term.schema';
import {
  MaterialCategory,
} from './schemas/material-category.schema';
import {
  PaymentTerm,
} from './schemas/payment-term.schema';
import {
  PreferredVendor,
} from './schemas/preferred-vendor.schema';
import { ProcurementMasterStatus } from './schemas/procurement-master-status';
import {
  PurchaseCategory,
} from './schemas/purchase-category.schema';
import { TaxRule } from './schemas/tax-rule.schema';
import {
  VendorCategory,
} from './schemas/vendor-category.schema';
import {
  VendorPriceList,
} from './schemas/vendor-price-list.schema';

type CatalogKind =
  | 'purchase-categories'
  | 'material-categories'
  | 'vendor-categories';

@Injectable()
export class ProcurementMastersService {
  constructor(
    @InjectModel(PurchaseCategory.name)
    private readonly purchaseCategoryModel: Model<PurchaseCategory>,
    @InjectModel(MaterialCategory.name)
    private readonly materialCategoryModel: Model<MaterialCategory>,
    @InjectModel(VendorCategory.name)
    private readonly vendorCategoryModel: Model<VendorCategory>,
    @InjectModel(PaymentTerm.name)
    private readonly paymentTermModel: Model<PaymentTerm>,
    @InjectModel(DeliveryTerm.name)
    private readonly deliveryTermModel: Model<DeliveryTerm>,
    @InjectModel(TaxRule.name)
    private readonly taxRuleModel: Model<TaxRule>,
    @InjectModel(PreferredVendor.name)
    private readonly preferredVendorModel: Model<PreferredVendor>,
    @InjectModel(VendorPriceList.name)
    private readonly vendorPriceListModel: Model<VendorPriceList>,
  ) {}

  // ─── generic code/name catalogs ────────────────────────────────────────

  async createCatalog(
    kind: CatalogKind,
    dto: CreateCatalogItemDto,
    companyId: string,
    actorId?: string,
  ) {
    const model = this.catalogModel(kind);
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await model.create({
        companyId: new Types.ObjectId(companyId),
        code,
        name: dto.name.trim(),
        status: ProcurementMasterStatus.Active,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(
        toPublicCatalogItem(row),
        `${this.label(kind)} created`,
      );
    } catch (error) {
      this.rethrowDuplicate(error, code);
    }
  }

  async updateCatalog(
    kind: CatalogKind,
    id: string,
    dto: UpdateCatalogItemDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireCatalog(kind, id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code.trim().toUpperCase();
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicate(error, row.code);
    }
    return createSuccessResponse(
      toPublicCatalogItem(row),
      `${this.label(kind)} updated`,
    );
  }

  async listCatalog(
    kind: CatalogKind,
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ) {
    this.requireCompany(companyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter = this.buildListFilter(companyId, query);
    const model = this.catalogModel(kind);
    const sort: Record<string, SortOrder> = { code: 1 };
    const [rows, total] = await Promise.all([
      model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      model.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((r) => toPublicCatalogItem(r)),
      this.label(kind),
      buildPaginationMeta(page, limit, total),
    );
  }

  async getCatalog(kind: CatalogKind, id: string, companyId: string) {
    const row = await this.requireCatalog(kind, id, companyId);
    return createSuccessResponse(toPublicCatalogItem(row));
  }

  async setCatalogStatus(
    kind: CatalogKind,
    id: string,
    status: ProcurementMasterStatus,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireCatalog(kind, id, companyId);
    row.status = status;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicCatalogItem(row),
      `${this.label(kind)} ${status}`,
    );
  }

  async removeCatalog(
    kind: CatalogKind,
    id: string,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireCatalog(kind, id, companyId);
    await row.softDelete(actorId ? new Types.ObjectId(actorId) : undefined);
    return createSuccessResponse(
      { id: String(row._id) },
      `${this.label(kind)} deleted`,
    );
  }

  // ─── payment terms ─────────────────────────────────────────────────────

  async createPaymentTerm(
    dto: CreatePaymentTermDto,
    companyId: string,
    actorId?: string,
  ) {
    this.requireCompany(companyId);
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await this.paymentTermModel.create({
        companyId: new Types.ObjectId(companyId),
        code,
        name: dto.name.trim(),
        days: dto.days,
        status: ProcurementMasterStatus.Active,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(
        toPublicPaymentTerm(row),
        'Payment term created',
      );
    } catch (error) {
      this.rethrowDuplicate(error, code);
    }
  }

  async updatePaymentTerm(
    id: string,
    dto: UpdatePaymentTermDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireRow(this.paymentTermModel, id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code.trim().toUpperCase();
    if (dto.days !== undefined) row.days = dto.days;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicate(error, row.code);
    }
    return createSuccessResponse(
      toPublicPaymentTerm(row),
      'Payment term updated',
    );
  }

  async listPaymentTerms(
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ) {
    this.requireCompany(companyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter = this.buildListFilter(companyId, query);
    const [rows, total] = await Promise.all([
      this.paymentTermModel
        .find(filter)
        .sort({ code: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.paymentTermModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((r) => toPublicPaymentTerm(r)),
      'Payment terms',
      buildPaginationMeta(page, limit, total),
    );
  }

  async removePaymentTerm(id: string, companyId: string, actorId?: string) {
    const row = await this.requireRow(this.paymentTermModel, id, companyId);
    await row.softDelete(actorId ? new Types.ObjectId(actorId) : undefined);
    return createSuccessResponse({ id }, 'Payment term deleted');
  }

  // ─── delivery terms ────────────────────────────────────────────────────

  async createDeliveryTerm(
    dto: CreateDeliveryTermDto,
    companyId: string,
    actorId?: string,
  ) {
    this.requireCompany(companyId);
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await this.deliveryTermModel.create({
        companyId: new Types.ObjectId(companyId),
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        status: ProcurementMasterStatus.Active,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(
        toPublicDeliveryTerm(row),
        'Delivery term created',
      );
    } catch (error) {
      this.rethrowDuplicate(error, code);
    }
  }

  async updateDeliveryTerm(
    id: string,
    dto: UpdateDeliveryTermDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireRow(this.deliveryTermModel, id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code.trim().toUpperCase();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicate(error, row.code);
    }
    return createSuccessResponse(
      toPublicDeliveryTerm(row),
      'Delivery term updated',
    );
  }

  async listDeliveryTerms(
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ) {
    this.requireCompany(companyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter = this.buildListFilter(companyId, query);
    const [rows, total] = await Promise.all([
      this.deliveryTermModel
        .find(filter)
        .sort({ code: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.deliveryTermModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((r) => toPublicDeliveryTerm(r)),
      'Delivery terms',
      buildPaginationMeta(page, limit, total),
    );
  }

  async removeDeliveryTerm(id: string, companyId: string, actorId?: string) {
    const row = await this.requireRow(this.deliveryTermModel, id, companyId);
    await row.softDelete(actorId ? new Types.ObjectId(actorId) : undefined);
    return createSuccessResponse({ id }, 'Delivery term deleted');
  }

  // ─── tax rules ─────────────────────────────────────────────────────────

  async createTaxRule(
    dto: CreateTaxRuleDto,
    companyId: string,
    actorId?: string,
  ) {
    this.requireCompany(companyId);
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await this.taxRuleModel.create({
        companyId: new Types.ObjectId(companyId),
        code,
        name: dto.name.trim(),
        gstPercent: dto.gstPercent,
        status: ProcurementMasterStatus.Active,
        createdBy: actorId ? new Types.ObjectId(actorId) : null,
      });
      return createSuccessResponse(toPublicTaxRule(row), 'Tax rule created');
    } catch (error) {
      this.rethrowDuplicate(error, code);
    }
  }

  async updateTaxRule(
    id: string,
    dto: UpdateTaxRuleDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireRow(this.taxRuleModel, id, companyId);
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code.trim().toUpperCase();
    if (dto.gstPercent !== undefined) row.gstPercent = dto.gstPercent;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    try {
      await row.save();
    } catch (error) {
      this.rethrowDuplicate(error, row.code);
    }
    return createSuccessResponse(toPublicTaxRule(row), 'Tax rule updated');
  }

  async listTaxRules(
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ) {
    this.requireCompany(companyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter = this.buildListFilter(companyId, query);
    const [rows, total] = await Promise.all([
      this.taxRuleModel
        .find(filter)
        .sort({ code: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.taxRuleModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((r) => toPublicTaxRule(r)),
      'Tax rules',
      buildPaginationMeta(page, limit, total),
    );
  }

  async removeTaxRule(id: string, companyId: string, actorId?: string) {
    const row = await this.requireRow(this.taxRuleModel, id, companyId);
    await row.softDelete(actorId ? new Types.ObjectId(actorId) : undefined);
    return createSuccessResponse({ id }, 'Tax rule deleted');
  }

  // ─── preferred vendors ─────────────────────────────────────────────────

  async createPreferredVendor(
    dto: CreatePreferredVendorDto,
    companyId: string,
    actorId?: string,
  ) {
    this.requireCompany(companyId);
    const row = await this.preferredVendorModel.create({
      companyId: new Types.ObjectId(companyId),
      vendorId: new Types.ObjectId(dto.vendorId),
      materialId: dto.materialId
        ? new Types.ObjectId(dto.materialId)
        : null,
      materialCategoryCode: dto.materialCategoryCode?.trim().toUpperCase() ?? null,
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
      priority: dto.priority ?? 1,
      notes: dto.notes?.trim() ?? null,
      status: ProcurementMasterStatus.Active,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });
    return createSuccessResponse(
      toPublicPreferredVendor(row),
      'Preferred vendor created',
    );
  }

  async updatePreferredVendor(
    id: string,
    dto: UpdatePreferredVendorDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireRow(this.preferredVendorModel, id, companyId);
    if (dto.vendorId !== undefined) {
      row.vendorId = new Types.ObjectId(dto.vendorId);
    }
    if (dto.materialId !== undefined) {
      row.materialId = dto.materialId
        ? new Types.ObjectId(dto.materialId)
        : null;
    }
    if (dto.materialCategoryCode !== undefined) {
      row.materialCategoryCode =
        dto.materialCategoryCode?.trim().toUpperCase() ?? null;
    }
    if (dto.projectId !== undefined) {
      row.projectId = dto.projectId
        ? new Types.ObjectId(dto.projectId)
        : null;
    }
    if (dto.priority !== undefined) row.priority = dto.priority;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicPreferredVendor(row),
      'Preferred vendor updated',
    );
  }

  async listPreferredVendors(
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ) {
    this.requireCompany(companyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<PreferredVendor> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      this.preferredVendorModel
        .find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.preferredVendorModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((r) => toPublicPreferredVendor(r)),
      'Preferred vendors',
      buildPaginationMeta(page, limit, total),
    );
  }

  async removePreferredVendor(id: string, companyId: string, actorId?: string) {
    const row = await this.requireRow(this.preferredVendorModel, id, companyId);
    await row.softDelete(actorId ? new Types.ObjectId(actorId) : undefined);
    return createSuccessResponse({ id }, 'Preferred vendor deleted');
  }

  // ─── vendor price lists ────────────────────────────────────────────────

  async createVendorPriceList(
    dto: CreateVendorPriceListDto,
    companyId: string,
    actorId?: string,
  ) {
    this.requireCompany(companyId);
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveTo =
      dto.effectiveTo === undefined || dto.effectiveTo === null
        ? null
        : new Date(dto.effectiveTo);
    const row = await this.vendorPriceListModel.create({
      companyId: new Types.ObjectId(companyId),
      vendorId: new Types.ObjectId(dto.vendorId),
      materialId: new Types.ObjectId(dto.materialId),
      unitPrice: dto.unitPrice,
      currency: (dto.currency ?? 'INR').trim().toUpperCase(),
      taxRuleId: dto.taxRuleId ? new Types.ObjectId(dto.taxRuleId) : null,
      effectiveFrom,
      effectiveTo,
      status: ProcurementMasterStatus.Active,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });
    return createSuccessResponse(
      toPublicVendorPriceList(row),
      'Vendor price list entry created',
    );
  }

  async updateVendorPriceList(
    id: string,
    dto: UpdateVendorPriceListDto,
    companyId: string,
    actorId?: string,
  ) {
    const row = await this.requireRow(this.vendorPriceListModel, id, companyId);
    if (dto.vendorId !== undefined) {
      row.vendorId = new Types.ObjectId(dto.vendorId);
    }
    if (dto.materialId !== undefined) {
      row.materialId = new Types.ObjectId(dto.materialId);
    }
    if (dto.unitPrice !== undefined) row.unitPrice = dto.unitPrice;
    if (dto.currency !== undefined) {
      row.currency = dto.currency.trim().toUpperCase();
    }
    if (dto.taxRuleId !== undefined) {
      row.taxRuleId = dto.taxRuleId
        ? new Types.ObjectId(dto.taxRuleId)
        : null;
    }
    if (dto.effectiveFrom !== undefined) {
      row.effectiveFrom = new Date(dto.effectiveFrom);
    }
    if (dto.effectiveTo !== undefined) {
      row.effectiveTo =
        dto.effectiveTo === null ? null : new Date(dto.effectiveTo);
    }
    row.set('updatedBy', actorId ? new Types.ObjectId(actorId) : null);
    await row.save();
    return createSuccessResponse(
      toPublicVendorPriceList(row),
      'Vendor price list entry updated',
    );
  }

  async listVendorPriceLists(
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ) {
    this.requireCompany(companyId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter: FilterQuery<VendorPriceList> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.status) filter.status = query.status;
    const [rows, total] = await Promise.all([
      this.vendorPriceListModel
        .find(filter)
        .sort({ effectiveFrom: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.vendorPriceListModel.countDocuments(filter).exec(),
    ]);
    return createSuccessResponse(
      rows.map((r) => toPublicVendorPriceList(r)),
      'Vendor price lists',
      buildPaginationMeta(page, limit, total),
    );
  }

  async removeVendorPriceList(id: string, companyId: string, actorId?: string) {
    const row = await this.requireRow(this.vendorPriceListModel, id, companyId);
    await row.softDelete(actorId ? new Types.ObjectId(actorId) : undefined);
    return createSuccessResponse({ id }, 'Vendor price list entry deleted');
  }

  /**
   * Idempotent seed of default payment terms, delivery terms, and tax rules.
   */
  async seedDefaults(companyId: string, actorId?: string) {
    this.requireCompany(companyId);
    const companyOid = new Types.ObjectId(companyId);
    const createdBy = actorId ? new Types.ObjectId(actorId) : null;
    let created = 0;
    let skipped = 0;

    for (const def of DEFAULT_PAYMENT_TERMS) {
      const existing = await this.paymentTermModel
        .findOne({ companyId: companyOid, code: def.code })
        .exec();
      if (existing) {
        skipped += 1;
        continue;
      }
      await this.paymentTermModel.create({
        companyId: companyOid,
        code: def.code,
        name: def.name,
        days: def.days,
        status: ProcurementMasterStatus.Active,
        createdBy,
      });
      created += 1;
    }

    for (const def of DEFAULT_DELIVERY_TERMS) {
      const existing = await this.deliveryTermModel
        .findOne({ companyId: companyOid, code: def.code })
        .exec();
      if (existing) {
        skipped += 1;
        continue;
      }
      await this.deliveryTermModel.create({
        companyId: companyOid,
        code: def.code,
        name: def.name,
        description: def.description,
        status: ProcurementMasterStatus.Active,
        createdBy,
      });
      created += 1;
    }

    for (const def of DEFAULT_TAX_RULES) {
      const existing = await this.taxRuleModel
        .findOne({ companyId: companyOid, code: def.code })
        .exec();
      if (existing) {
        skipped += 1;
        continue;
      }
      await this.taxRuleModel.create({
        companyId: companyOid,
        code: def.code,
        name: def.name,
        gstPercent: def.gstPercent,
        status: ProcurementMasterStatus.Active,
        createdBy,
      });
      created += 1;
    }

    return createSuccessResponse(
      {
        created,
        skipped,
        total:
          DEFAULT_PAYMENT_TERMS.length +
          DEFAULT_DELIVERY_TERMS.length +
          DEFAULT_TAX_RULES.length,
      },
      created > 0
        ? 'Procurement master defaults seeded'
        : 'Procurement master defaults already present',
    );
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private catalogModel(kind: CatalogKind) {
    switch (kind) {
      case 'purchase-categories':
        return this.purchaseCategoryModel;
      case 'material-categories':
        return this.materialCategoryModel;
      case 'vendor-categories':
        return this.vendorCategoryModel;
    }
  }

  private label(kind: CatalogKind): string {
    switch (kind) {
      case 'purchase-categories':
        return 'Purchase category';
      case 'material-categories':
        return 'Material category';
      case 'vendor-categories':
        return 'Vendor category';
    }
  }

  private buildListFilter(
    companyId: string,
    query: ListProcurementMastersQueryDto,
  ): FilterQuery<{ companyId: Types.ObjectId; status?: string; code?: string; name?: string }> {
    const filter: FilterQuery<{
      companyId: Types.ObjectId;
      status?: string;
      code?: string;
      name?: string;
    }> = {
      companyId: new Types.ObjectId(companyId),
    };
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const q = query.search.trim();
      filter.$or = [
        { code: new RegExp(q, 'i') },
        { name: new RegExp(q, 'i') },
      ];
    }
    return filter;
  }

  private async requireCatalog(
    kind: CatalogKind,
    id: string,
    companyId: string,
  ) {
    return this.requireRow(this.catalogModel(kind), id, companyId);
  }

  private async requireRow<T extends { companyId: Types.ObjectId }>(
    model: Model<T>,
    id: string,
    companyId: string,
  ) {
    this.requireCompany(companyId);
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Record not found');
    }
    const row = await model.findById(id).exec();
    if (!row || String(row.companyId) !== companyId) {
      throw new NotFoundException('Record not found');
    }
    return row;
  }

  private requireCompany(
    companyId: string | null | undefined,
  ): asserts companyId is string {
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new ForbiddenException('Authenticated company context required');
    }
  }

  private rethrowDuplicate(error: unknown, code: string): never {
    if ((error as { code?: number }).code === 11000) {
      throw new ConflictException(`Code ${code} already exists`);
    }
    throw error;
  }
}
