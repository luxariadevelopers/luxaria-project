import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import type { AppConfig } from '../../config/configuration';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import {
  GoodsReceipt,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { JournalService } from '../journal/journal.service';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import { Vendor, VendorStatus } from '../vendors/schemas/vendor.schema';
import type {
  ApproveVendorInvoiceDto,
  CreateVendorInvoiceDto,
  ListVendorInvoicesQueryDto,
  RejectMatchingDto,
  UpdateVendorInvoiceDto,
  VendorInvoiceItemDto,
} from './dto/vendor-invoice.dto';
import {
  assertInvoicePaymentAllowed,
  runThreeWayMatch,
  type ThreeWayTolerances,
} from './three-way-matching.engine';
import { toPublicVendorInvoice } from './vendor-invoices.mapper';
import {
  assertHeaderTotals,
  computeLineAmount,
  computeRemainingPayable,
  normalizeInvoiceNumber,
  roundMoney,
  roundQty,
  type VarianceDraft,
} from './vendor-invoices.validation';
import {
  VendorInvoice,
  VendorInvoiceDocument,
  VendorInvoiceItem,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from './schemas/vendor-invoice.schema';

const POSTABLE_GRN_STATUSES = [
  GoodsReceiptStatus.Accepted,
  GoodsReceiptStatus.PartiallyAccepted,
  GoodsReceiptStatus.Posted,
];

const OPEN_INVOICE_STATUSES = [
  VendorInvoiceStatus.Draft,
  VendorInvoiceStatus.Submitted,
  VendorInvoiceStatus.Verification,
  VendorInvoiceStatus.Matching,
  VendorInvoiceStatus.Approval,
  VendorInvoiceStatus.Posted,
  VendorInvoiceStatus.Paid,
];

@Injectable()
export class VendorInvoicesService {
  constructor(
    @InjectModel(VendorInvoice.name)
    private readonly invoiceModel: Model<VendorInvoice>,
    @InjectModel(PurchaseOrder.name)
    private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(GoodsReceipt.name)
    private readonly grnModel: Model<GoodsReceipt>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<Vendor>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly numberingService: NumberingService,
    private readonly journalService: JournalService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async create(dto: CreateVendorInvoiceDto, actorId: string) {
    const invoiceNumber = normalizeInvoiceNumber(dto.invoiceNumber);
    await this.assertUniqueInvoiceNumber(dto.vendorId, invoiceNumber);

    const po = await this.requireOpenPo(dto.purchaseOrderId);
    if (String(po.vendorId) !== dto.vendorId) {
      throw new BadRequestException('vendorId does not match purchase order');
    }
    if (String(po.projectId) !== dto.projectId) {
      throw new BadRequestException('projectId does not match purchase order');
    }

    await this.requireActiveVendor(dto.vendorId);
    const grnIds = await this.validateGrns({
      grnIds: dto.grnIds,
      purchaseOrderId: dto.purchaseOrderId,
      vendorId: dto.vendorId,
      projectId: dto.projectId,
    });

    const invoiceDate = this.parseDate(dto.invoiceDate, 'invoiceDate');
    const dueDate = this.parseDate(dto.dueDate, 'dueDate');
    if (dueDate.getTime() < invoiceDate.getTime()) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }

    const taxableValue = roundMoney(dto.taxableValue);
    const gst = roundMoney(dto.gst);
    const tds = roundMoney(dto.tds ?? 0);
    const retention = roundMoney(dto.retention ?? 0);
    const freight = roundMoney(dto.freight ?? 0);
    const discount = roundMoney(dto.discount ?? 0);
    const totalAmount = roundMoney(dto.totalAmount);
    assertHeaderTotals({
      taxableValue,
      gst,
      freight,
      totalAmount,
      tds,
      retention,
    });

    const items = await this.buildItems(dto.items, po);
    const documentNumber = await this.numberingService.nextCode(
      NumberEntityType.VENDOR_INVOICE,
      {
        asOf: invoiceDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.invoiceModel.create({
      documentNumber,
      invoiceNumber,
      vendorId: new Types.ObjectId(dto.vendorId),
      projectId: new Types.ObjectId(dto.projectId),
      purchaseOrderId: new Types.ObjectId(dto.purchaseOrderId),
      grnIds,
      invoiceDate,
      dueDate,
      taxableValue,
      gst,
      tds,
      retention,
      freight,
      discount,
      totalAmount,
      paidAmount: 0,
      invoiceDocument: dto.invoiceDocument?.trim() || null,
      items,
      variances: [],
      matchingStatus: VendorInvoiceMatchingStatus.Pending,
      exceptionApproved: false,
      status: VendorInvoiceStatus.Draft,
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice created as draft',
    );
  }

  async update(id: string, dto: UpdateVendorInvoiceDto, actorId: string) {
    const row = await this.requireInvoice(id);
    if (row.status !== VendorInvoiceStatus.Draft) {
      throw new BadRequestException('Only draft vendor invoices can be updated');
    }

    if (dto.invoiceNumber !== undefined) {
      const invoiceNumber = normalizeInvoiceNumber(dto.invoiceNumber);
      await this.assertUniqueInvoiceNumber(
        String(row.vendorId),
        invoiceNumber,
        String(row._id),
      );
      row.invoiceNumber = invoiceNumber;
    }

    if (dto.grnIds) {
      row.grnIds = await this.validateGrns({
        grnIds: dto.grnIds,
        purchaseOrderId: String(row.purchaseOrderId),
        vendorId: String(row.vendorId),
        projectId: String(row.projectId),
      });
    }

    if (dto.invoiceDate) {
      row.invoiceDate = this.parseDate(dto.invoiceDate, 'invoiceDate');
    }
    if (dto.dueDate) {
      row.dueDate = this.parseDate(dto.dueDate, 'dueDate');
    }
    if (row.dueDate.getTime() < row.invoiceDate.getTime()) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }

    if (dto.taxableValue !== undefined) row.taxableValue = roundMoney(dto.taxableValue);
    if (dto.gst !== undefined) row.gst = roundMoney(dto.gst);
    if (dto.tds !== undefined) row.tds = roundMoney(dto.tds);
    if (dto.retention !== undefined) row.retention = roundMoney(dto.retention);
    if (dto.freight !== undefined) row.freight = roundMoney(dto.freight);
    if (dto.discount !== undefined) row.discount = roundMoney(dto.discount);
    if (dto.totalAmount !== undefined) {
      row.totalAmount = roundMoney(dto.totalAmount);
    }
    assertHeaderTotals({
      taxableValue: row.taxableValue,
      gst: row.gst,
      freight: row.freight,
      totalAmount: row.totalAmount,
      tds: row.tds,
      retention: row.retention,
    });

    if (dto.invoiceDocument !== undefined) {
      row.invoiceDocument = dto.invoiceDocument?.trim() || null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    if (dto.items) {
      const po = await this.requireOpenPo(String(row.purchaseOrderId));
      row.items = await this.buildItems(dto.items, po);
    }

    row.matchingStatus = VendorInvoiceMatchingStatus.Pending;
    row.exceptionApproved = false;
    row.exceptionApprovedBy = null;
    row.exceptionApprovedAt = null;
    row.exceptionApprovedComment = null;
    row.matchingRejectedBy = null;
    row.matchingRejectedAt = null;
    row.matchingRejectionReason = null;
    row.variances = [];
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireInvoice(id);
    if (row.status !== VendorInvoiceStatus.Draft) {
      throw new BadRequestException('Only draft invoices can be submitted');
    }
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }
    await this.assertUniqueInvoiceNumber(
      String(row.vendorId),
      row.invoiceNumber,
      String(row._id),
    );

    row.status = VendorInvoiceStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice submitted',
    );
  }

  async verify(id: string, actorId: string) {
    const row = await this.requireInvoice(id);
    if (row.status !== VendorInvoiceStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted invoices can move to verification',
      );
    }

    row.status = VendorInvoiceStatus.Verification;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice moved to verification',
    );
  }

  /**
   * Three-way match: Purchase Order ↔ GRN accepted qty ↔ Vendor Invoice.
   */
  async match(id: string, actorId: string) {
    const row = await this.requireInvoice(id);
    if (
      row.status !== VendorInvoiceStatus.Verification &&
      !(
        row.status === VendorInvoiceStatus.Matching &&
        row.matchingStatus === VendorInvoiceMatchingStatus.Rejected
      )
    ) {
      throw new BadRequestException(
        'Only invoices in verification (or rejected matching) can be matched',
      );
    }

    const { items, variances, matchingStatus } = await this.runMatching(row);
    row.items = items;
    row.variances = variances;
    row.matchingStatus = matchingStatus;
    row.exceptionApproved = false;
    row.exceptionApprovedBy = null;
    row.exceptionApprovedAt = null;
    row.exceptionApprovedComment = null;
    row.matchingRejectedBy = null;
    row.matchingRejectedAt = null;
    row.matchingRejectionReason = null;
    row.status = VendorInvoiceStatus.Matching;
    row.matchedBy = new Types.ObjectId(actorId);
    row.matchedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    row.markModified('items');
    row.markModified('variances');
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      `Three-way matching complete (${matchingStatus})`,
    );
  }

  async rejectMatching(
    id: string,
    actorId: string,
    dto: RejectMatchingDto,
  ) {
    const row = await this.requireInvoice(id);
    if (row.status !== VendorInvoiceStatus.Matching) {
      throw new BadRequestException(
        'Only invoices in matching can be rejected',
      );
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    row.matchingStatus = VendorInvoiceMatchingStatus.Rejected;
    row.matchingRejectedBy = new Types.ObjectId(actorId);
    row.matchingRejectedAt = new Date();
    row.matchingRejectionReason = dto.reason.trim();
    row.exceptionApproved = false;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Three-way matching rejected',
    );
  }

  async approve(
    id: string,
    actorId: string,
    dto: ApproveVendorInvoiceDto = {},
  ) {
    const row = await this.requireInvoice(id);
    if (row.status !== VendorInvoiceStatus.Matching) {
      throw new BadRequestException(
        'Only matched invoices can move to approval',
      );
    }
    if (row.matchingStatus === VendorInvoiceMatchingStatus.Rejected) {
      throw new BadRequestException(
        'Rejected matching cannot be approved — re-run match first',
      );
    }
    if (row.matchingStatus === VendorInvoiceMatchingStatus.Pending) {
      throw new BadRequestException('Run three-way matching before approval');
    }

    if (
      row.matchingStatus === VendorInvoiceMatchingStatus.Exception &&
      !dto.exceptionApprovalComment?.trim()
    ) {
      throw new BadRequestException(
        'Matching exceptions require exceptionApprovalComment before approval',
      );
    }

    if (row.matchingStatus === VendorInvoiceMatchingStatus.Exception) {
      row.exceptionApproved = true;
      row.exceptionApprovedBy = new Types.ObjectId(actorId);
      row.exceptionApprovedAt = new Date();
      row.exceptionApprovedComment =
        dto.exceptionApprovalComment?.trim() ?? null;
      row.notes = [
        row.notes,
        `Exception approval: ${dto.exceptionApprovalComment!.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');
    }

    row.status = VendorInvoiceStatus.Approval;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice approved',
    );
  }

  async post(id: string, actorId: string) {
    const row = await this.requireInvoice(id);
    if (row.status !== VendorInvoiceStatus.Approval) {
      throw new BadRequestException('Only approved invoices can be posted');
    }
    if (row.journalEntryId) {
      throw new ConflictException('Invoice already has a journal entry');
    }

    const journalId = await this.postApJournal(row, actorId);
    row.journalEntryId = new Types.ObjectId(journalId);
    row.status = VendorInvoiceStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice posted',
    );
  }

  async markPaid(id: string, actorId: string) {
    const row = await this.requireInvoice(id);
    assertInvoicePaymentAllowed({
      status: row.status,
      matchingStatus: row.matchingStatus,
      exceptionApproved: row.exceptionApproved === true,
    });

    row.status = VendorInvoiceStatus.Paid;
    row.paidBy = new Types.ObjectId(actorId);
    row.paidAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice marked paid',
    );
  }

  /** Phase 46 hook — same gate as markPaid. */
  assertPayable(id: string) {
    return this.requireInvoice(id).then((row) => {
      assertInvoicePaymentAllowed({
        status: row.status,
        matchingStatus: row.matchingStatus,
        exceptionApproved: row.exceptionApproved === true,
      });
      return toPublicVendorInvoice(row);
    });
  }

  /**
   * Apply a posted vendor-payment allocation to an invoice.
   * Increments paidAmount; marks Paid when remaining payable is cleared.
   */
  async applyPaymentAllocation(
    invoiceId: string,
    amount: number,
    actorId: string,
  ) {
    const row = await this.requireInvoice(invoiceId);
    assertInvoicePaymentAllowed({
      status: row.status,
      matchingStatus: row.matchingStatus,
      exceptionApproved: row.exceptionApproved === true,
    });

    const applyAmount = roundMoney(amount);
    if (applyAmount <= 0) {
      throw new BadRequestException('Payment allocation amount must be > 0');
    }

    const remaining = computeRemainingPayable({
      totalAmount: row.totalAmount,
      tds: row.tds,
      retention: row.retention,
      paidAmount: row.paidAmount ?? 0,
    });
    if (applyAmount - remaining > 0.005) {
      throw new BadRequestException(
        `Payment allocation (${applyAmount}) exceeds remaining payable (${remaining}) on invoice ${row.documentNumber}`,
      );
    }

    row.paidAmount = roundMoney((row.paidAmount ?? 0) + applyAmount);
    const nextRemaining = computeRemainingPayable({
      totalAmount: row.totalAmount,
      tds: row.tds,
      retention: row.retention,
      paidAmount: row.paidAmount,
    });
    if (nextRemaining <= 0.005) {
      row.paidAmount = roundMoney(
        row.totalAmount - (row.tds ?? 0) - (row.retention ?? 0),
      );
      row.status = VendorInvoiceStatus.Paid;
      row.paidBy = new Types.ObjectId(actorId);
      row.paidAt = new Date();
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return row;
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireInvoice(id);
    const cancellable = [
      VendorInvoiceStatus.Draft,
      VendorInvoiceStatus.Submitted,
      VendorInvoiceStatus.Verification,
      VendorInvoiceStatus.Matching,
      VendorInvoiceStatus.Approval,
    ];
    if (!cancellable.includes(row.status)) {
      throw new BadRequestException(
        'Posted or paid invoices cannot be cancelled',
      );
    }

    row.status = VendorInvoiceStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireInvoice(id);
    return createSuccessResponse(
      toPublicVendorInvoice(row),
      'Vendor invoice fetched successfully',
    );
  }

  async list(query: ListVendorInvoicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<VendorInvoice> = {};

    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);
    if (query.purchaseOrderId) {
      filter.purchaseOrderId = new Types.ObjectId(query.purchaseOrderId);
    }
    if (query.status) filter.status = query.status;
    if (query.matchingStatus) filter.matchingStatus = query.matchingStatus;
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const sort: Record<string, SortOrder> = { invoiceDate: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicVendorInvoice(row)),
      'Vendor invoices fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private getTolerances(): ThreeWayTolerances {
    return {
      quantityPercent:
        this.configService.get('vendorInvoiceQtyTolerancePercent', {
          infer: true,
        }) ?? 0,
      ratePercent:
        this.configService.get('vendorInvoiceRateTolerancePercent', {
          infer: true,
        }) ?? 0,
      taxPercent:
        this.configService.get('vendorInvoiceTaxTolerancePercent', {
          infer: true,
        }) ?? 0,
      freightPercent:
        this.configService.get('vendorInvoiceFreightTolerancePercent', {
          infer: true,
        }) ?? 0,
      discountPercent:
        this.configService.get('vendorInvoiceDiscountTolerancePercent', {
          infer: true,
        }) ?? 0,
      totalPercent:
        this.configService.get('vendorInvoiceTotalTolerancePercent', {
          infer: true,
        }) ?? 0,
    };
  }

  private async runMatching(row: VendorInvoiceDocument): Promise<{
    items: VendorInvoiceItem[];
    variances: VarianceDraft[];
    matchingStatus: VendorInvoiceMatchingStatus;
  }> {
    const po = await this.requireOpenPo(String(row.purchaseOrderId));
    const acceptedByKey = await this.aggregateGrnAccepted(row);
    const alreadyInvoiced = await this.aggregateAlreadyInvoiced(
      String(row.purchaseOrderId),
      String(row._id),
    );

    const remainingGrnAcceptedByKey = new Map<string, number>();
    for (const [key, accepted] of acceptedByKey) {
      const prior = alreadyInvoiced.get(key) ?? 0;
      remainingGrnAcceptedByKey.set(
        key,
        roundQty(Math.max(0, accepted - prior)),
      );
    }

    const result = runThreeWayMatch({
      po: {
        taxes: po.taxes ?? 0,
        freight: po.freight ?? 0,
        discount: po.discount ?? 0,
        total: po.total ?? 0,
        items: po.items.map((l) => ({
          id: String(l._id),
          materialId: String(l.materialId),
          quantity: l.quantity,
          rate: l.rate,
          tax: l.tax ?? 0,
          discount: l.discount ?? 0,
          total: l.total,
        })),
      },
      invoice: {
        gst: row.gst,
        freight: row.freight,
        discount: row.discount ?? 0,
        totalAmount: row.totalAmount,
        items: row.items.map((item) => ({
          materialId: String(item.materialId),
          materialCode: item.materialCode,
          purchaseOrderLineId: item.purchaseOrderLineId
            ? String(item.purchaseOrderLineId)
            : null,
          quantity: item.quantity,
          rate: item.rate,
          tax: item.tax ?? 0,
          amount: item.amount,
        })),
      },
      remainingGrnAcceptedByKey,
      tolerances: this.getTolerances(),
    });

    const lineByMaterial = new Map(
      result.lineResults.map((l) => [l.materialId, l]),
    );

    const items: VendorInvoiceItem[] = row.items.map((item) => {
      const snap = lineByMaterial.get(String(item.materialId));
      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        purchaseOrderLineId: item.purchaseOrderLineId,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        tax: item.tax,
        amount: item.amount,
        poRate: snap?.poRate ?? null,
        poOrderedQuantity: snap?.poOrderedQuantity ?? null,
        grnAcceptedQuantity: snap?.grnAcceptedQuantity ?? 0,
        quantityVariance: snap?.quantityVariance ?? null,
        rateVariance: snap?.rateVariance ?? null,
        taxVariance: snap?.taxVariance ?? null,
        poLineTax: snap?.poLineTax ?? null,
      };
    });

    return {
      items,
      variances: result.variances,
      matchingStatus: result.matchingStatus,
    };
  }

  private async aggregateGrnAccepted(
    row: VendorInvoiceDocument,
  ): Promise<Map<string, number>> {
    const grns = await this.grnModel
      .find({
        _id: { $in: row.grnIds },
        status: { $in: POSTABLE_GRN_STATUSES },
      })
      .lean()
      .exec();

    const map = new Map<string, number>();
    for (const grn of grns) {
      for (const item of grn.items ?? []) {
        const accepted = item.acceptedQuantity ?? 0;
        if (accepted <= 0) continue;
        const matKey = `mat:${String(item.materialId)}`;
        map.set(matKey, roundQty((map.get(matKey) ?? 0) + accepted));
        if (item.purchaseOrderLineId) {
          const lineKey = `line:${String(item.purchaseOrderLineId)}`;
          map.set(lineKey, roundQty((map.get(lineKey) ?? 0) + accepted));
        }
      }
    }
    return map;
  }

  private async aggregateAlreadyInvoiced(
    purchaseOrderId: string,
    excludeInvoiceId: string,
  ): Promise<Map<string, number>> {
    const others = await this.invoiceModel
      .find({
        purchaseOrderId: new Types.ObjectId(purchaseOrderId),
        _id: { $ne: new Types.ObjectId(excludeInvoiceId) },
        status: { $in: OPEN_INVOICE_STATUSES },
      })
      .select({ items: 1 })
      .lean()
      .exec();

    const map = new Map<string, number>();
    for (const inv of others) {
      for (const item of inv.items ?? []) {
        const matKey = `mat:${String(item.materialId)}`;
        map.set(matKey, roundQty((map.get(matKey) ?? 0) + item.quantity));
        if (item.purchaseOrderLineId) {
          const lineKey = `line:${String(item.purchaseOrderLineId)}`;
          map.set(lineKey, roundQty((map.get(lineKey) ?? 0) + item.quantity));
        }
      }
    }
    return map;
  }

  private async postApJournal(
    row: VendorInvoiceDocument,
    actorId: string,
  ): Promise<string> {
    const wip = await this.requireAccountByCategory(
      AccountCategory.WorkInProgress,
    );
    const inputGst = await this.requireAccountByCategory(
      AccountCategory.InputGst,
    );
    const vendorPayable = await this.requireAccountByCategory(
      AccountCategory.VendorPayable,
    );
    const tdsPayable = await this.requireAccountByCategory(
      AccountCategory.TdsPayable,
    );
    const retentionPayable = await this.requireAccountByCategory(
      AccountCategory.RetentionPayable,
    );

    const netPayable = roundMoney(
      row.totalAmount - row.tds - row.retention,
    );
    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      projectId: string;
      description: string;
      partyType?: JournalPartyType;
      partyId?: string;
    }> = [
      {
        accountId: String(wip._id),
        debit: roundMoney(row.taxableValue + row.freight),
        credit: 0,
        projectId: String(row.projectId),
        description: `Vendor invoice ${row.invoiceNumber} taxable+freight`,
      },
    ];

    if (row.gst > 0) {
      lines.push({
        accountId: String(inputGst._id),
        debit: row.gst,
        credit: 0,
        projectId: String(row.projectId),
        description: `Input GST ${row.invoiceNumber}`,
      });
    }
    if (row.tds > 0) {
      lines.push({
        accountId: String(tdsPayable._id),
        debit: 0,
        credit: row.tds,
        projectId: String(row.projectId),
        description: `TDS ${row.invoiceNumber}`,
      });
    }
    if (row.retention > 0) {
      lines.push({
        accountId: String(retentionPayable._id),
        debit: 0,
        credit: row.retention,
        projectId: String(row.projectId),
        description: `Retention ${row.invoiceNumber}`,
      });
    }
    lines.push({
      accountId: String(vendorPayable._id),
      debit: 0,
      credit: netPayable,
      projectId: String(row.projectId),
      description: `Vendor payable ${row.invoiceNumber}`,
      partyType: JournalPartyType.Vendor,
      partyId: String(row.vendorId),
    });

    const journal = await this.journalService.create(
      {
        journalDate: row.invoiceDate.toISOString().slice(0, 10),
        projectId: String(row.projectId),
        sourceModule: 'vendor_invoice',
        sourceEntityType: 'vendor_invoice',
        sourceEntityId: String(row._id),
        narration: `Vendor invoice ${row.documentNumber} / ${row.invoiceNumber}`.slice(
          0,
          500,
        ),
        lines,
        post: true,
      },
      actorId,
      `vendor-invoice-journal:${String(row._id)}`,
    );

    const journalId = journal.data?.id;
    if (!journalId) {
      throw new BadRequestException('Journal entry creation failed');
    }
    return journalId;
  }

  private async buildItems(
    dtos: VendorInvoiceItemDto[],
    po: PurchaseOrder,
  ): Promise<VendorInvoiceItem[]> {
    const items: VendorInvoiceItem[] = [];
    for (const dto of dtos) {
      const material = await this.requireActiveMaterial(dto.materialId);
      let poLine = dto.purchaseOrderLineId
        ? po.items.find((l) => String(l._id) === dto.purchaseOrderLineId)
        : undefined;
      if (!poLine) {
        poLine = po.items.find((l) => String(l.materialId) === dto.materialId);
      }
      if (!poLine) {
        throw new BadRequestException(
          `Material ${dto.materialId} is not on purchase order ${po.purchaseOrderNumber}`,
        );
      }

      const quantity = roundQty(dto.quantity);
      const rate = roundMoney(dto.rate);
      const tax = roundMoney(dto.tax ?? 0);
      items.push({
        materialId: material._id as Types.ObjectId,
        materialCode: material.materialCode,
        materialName: material.name,
        purchaseOrderLineId: (poLine._id as Types.ObjectId) ?? null,
        quantity,
        unit: dto.unit,
        rate,
        tax,
        amount: computeLineAmount({ quantity, rate, tax }),
        poRate: null,
        poOrderedQuantity: null,
        grnAcceptedQuantity: null,
        quantityVariance: null,
        rateVariance: null,
        taxVariance: null,
        poLineTax: null,
      });
    }
    return items;
  }

  private async validateGrns(input: {
    grnIds: string[];
    purchaseOrderId: string;
    vendorId: string;
    projectId: string;
  }): Promise<Types.ObjectId[]> {
    const unique = [...new Set(input.grnIds)];
    const ids = unique.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid grnId: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    const grns = await this.grnModel.find({ _id: { $in: ids } }).exec();
    if (grns.length !== ids.length) {
      throw new NotFoundException('One or more GRNs were not found');
    }

    for (const grn of grns) {
      if (String(grn.purchaseOrderId) !== input.purchaseOrderId) {
        throw new BadRequestException(
          `GRN ${grn.grnNumber} does not belong to the purchase order`,
        );
      }
      if (String(grn.vendorId) !== input.vendorId) {
        throw new BadRequestException(
          `GRN ${grn.grnNumber} vendor does not match invoice vendor`,
        );
      }
      if (String(grn.projectId) !== input.projectId) {
        throw new BadRequestException(
          `GRN ${grn.grnNumber} project does not match invoice project`,
        );
      }
      if (!POSTABLE_GRN_STATUSES.includes(grn.status)) {
        throw new BadRequestException(
          `GRN ${grn.grnNumber} must be accepted or posted before invoicing`,
        );
      }
    }

    return ids;
  }

  private async assertUniqueInvoiceNumber(
    vendorId: string,
    invoiceNumber: string,
    excludeId?: string,
  ) {
    const filter: FilterQuery<VendorInvoice> = {
      vendorId: new Types.ObjectId(vendorId),
      invoiceNumber,
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.invoiceModel.findOne(filter).exec();
    if (existing) {
      throw new ConflictException(
        `Duplicate vendor invoice number ${invoiceNumber} for this vendor`,
      );
    }
  }

  private async requireOpenPo(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchaseOrderId');
    }
    const po = await this.poModel.findById(id).exec();
    if (!po) throw new NotFoundException('Purchase order not found');
    const allowed = [
      PurchaseOrderStatus.Issued,
      PurchaseOrderStatus.PartiallyReceived,
      PurchaseOrderStatus.FullyReceived,
      PurchaseOrderStatus.Closed,
    ];
    if (!allowed.includes(po.status)) {
      throw new BadRequestException(
        `Purchase order status ${po.status} cannot be invoiced`,
      );
    }
    return po;
  }

  private async requireActiveVendor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendorId');
    }
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor || vendor.status !== VendorStatus.Active) {
      throw new NotFoundException('Active vendor not found');
    }
    return vendor;
  }

  private async requireActiveMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid materialId');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material || material.status !== MaterialStatus.Active) {
      throw new NotFoundException(`Active material not found: ${id}`);
    }
    return material;
  }

  private async requireAccountByCategory(category: AccountCategory) {
    const account = await this.accountModel
      .findOne({
        accountCategory: category,
        status: AccountStatus.Active,
        allowManualPosting: true,
      })
      .exec();
    if (!account) {
      throw new BadRequestException(
        `No active posting account found for category ${category}`,
      );
    }
    return account;
  }

  private async requireInvoice(id: string): Promise<VendorInvoiceDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendor invoice id');
    }
    const row = await this.invoiceModel.findById(id).exec();
    if (!row) throw new NotFoundException('Vendor invoice not found');
    return row;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }
}
