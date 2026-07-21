import {
  BadRequestException,
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
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import { toAddressEmbed } from '../company/schemas/address.embed';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import { Project } from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  VendorQuotation,
  VendorQuotationStatus,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import {
  Vendor,
  VendorStatus,
} from '../vendors/schemas/vendor.schema';
import type {
  ApprovePurchaseOrderDto,
  CreatePurchaseOrderDto,
  ListPurchaseOrdersQueryDto,
  PurchaseOrderItemInputDto,
  ReceivePurchaseOrderDto,
  RejectPurchaseOrderDto,
  RevisePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import { PurchaseOrderPdfService } from './purchase-order-pdf.service';
import { toPublicPurchaseOrder } from './purchase-orders.mapper';
import {
  assertMaterialUnitAllowed,
  assertNonNegative,
  assertOrderDates,
  assertPositiveQuantity,
  assertReceivableQuantity,
  computeBalanceQuantity,
  computeLineTotal,
  computePoTotal,
  DEFAULT_RECEIVE_TOLERANCE_PERCENT,
  estimateBalanceAmount,
  roundMoney,
} from './purchase-orders.validation';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  type PurchaseOrderItem,
} from './schemas/purchase-order.schema';

export const PURCHASE_ORDER_APPROVAL_MODULE = 'procurement';
export const PURCHASE_ORDER_APPROVAL_ENTITY = 'purchase_order';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectModel(PurchaseOrder.name)
    private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseRequestModel: Model<PurchaseRequest>,
    @InjectModel(VendorQuotation.name)
    private readonly quotationModel: Model<VendorQuotation>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    private readonly numberingService: NumberingService,
    private readonly approvalsService: ApprovalsService,
    private readonly pdfService: PurchaseOrderPdfService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async create(dto: CreatePurchaseOrderDto, actorId: string) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'purchase-order' },
    );
    const pr = await this.requireEligiblePurchaseRequest(dto.purchaseRequestId);
    if (String(pr.projectId) !== dto.projectId) {
      throw new BadRequestException(
        'projectId must match the purchase request project',
      );
    }
    await this.requireProject(dto.projectId);

    const quotation = await this.requireUsableQuotation(
      dto.selectedQuotationId,
      dto.purchaseRequestId,
    );
    const vendorId = dto.vendorId ?? String(quotation.vendorId);
    if (vendorId !== String(quotation.vendorId)) {
      throw new BadRequestException(
        'vendorId must match the selected quotation vendor',
      );
    }
    await this.requireActiveVendor(vendorId);

    const orderDate = this.parseDate(dto.orderDate, 'orderDate');
    const expectedDeliveryDate = this.parseDate(
      dto.expectedDeliveryDate,
      'expectedDeliveryDate',
    );
    assertOrderDates(orderDate, expectedDeliveryDate);

    const itemInputs =
      dto.items ??
      quotation.items.map((i) => ({
        materialId: String(i.materialId),
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
        tax: i.tax,
        discount: i.discount,
      }));
    const built = await this.buildItems(itemInputs);

    const taxes = dto.taxes ?? quotation.taxes;
    const freight = dto.freight ?? quotation.freight;
    const discount = dto.discount ?? quotation.discount;
    assertNonNegative(taxes, 'taxes');
    assertNonNegative(freight, 'freight');
    assertNonNegative(discount, 'discount');

    const subtotal = roundMoney(built.reduce((s, i) => s + i.total, 0));
    const total = computePoTotal({ subtotal, taxes, freight, discount });
    const balances = this.computeHeaderBalances(built);

    const purchaseOrderNumber = await this.numberingService.nextCode(
      NumberEntityType.PURCHASE_ORDER,
      {
        asOf: orderDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.poModel.create({
      purchaseOrderNumber,
      projectId: new Types.ObjectId(dto.projectId),
      purchaseRequestId: pr._id,
      selectedQuotationId: quotation._id,
      vendorId: new Types.ObjectId(vendorId),
      orderDate,
      expectedDeliveryDate,
      billingAddress: toAddressEmbed(dto.billingAddress),
      deliveryAddress: toAddressEmbed(dto.deliveryAddress),
      paymentTerms:
        dto.paymentTerms?.trim() || quotation.paymentTerms || null,
      items: built,
      subtotal,
      taxes,
      freight,
      discount,
      total,
      terms: dto.terms?.trim() || null,
      status: PurchaseOrderStatus.Draft,
      revisionNumber: 1,
      rootPurchaseOrderId: null,
      revisedFromId: null,
      balanceQuantity: balances.balanceQuantity,
      balanceAmount: balances.balanceAmount,
      createdBy: new Types.ObjectId(actorId),
    });

    row.rootPurchaseOrderId = row._id as Types.ObjectId;
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order created as draft',
    );
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, actorId: string) {
    const row = await this.requirePo(id, actorId, 'update');
    this.assertDraftEditable(row);

    if (dto.orderDate !== undefined) {
      row.orderDate = this.parseDate(dto.orderDate, 'orderDate');
    }
    if (dto.expectedDeliveryDate !== undefined) {
      row.expectedDeliveryDate = this.parseDate(
        dto.expectedDeliveryDate,
        'expectedDeliveryDate',
      );
    }
    assertOrderDates(row.orderDate, row.expectedDeliveryDate);

    if (dto.billingAddress) {
      row.billingAddress = toAddressEmbed(dto.billingAddress);
    }
    if (dto.deliveryAddress) {
      row.deliveryAddress = toAddressEmbed(dto.deliveryAddress);
    }
    if (dto.paymentTerms !== undefined) {
      row.paymentTerms = dto.paymentTerms?.trim() || null;
    }
    if (dto.terms !== undefined) row.terms = dto.terms?.trim() || null;
    if (dto.taxes !== undefined) {
      assertNonNegative(dto.taxes, 'taxes');
      row.taxes = dto.taxes;
    }
    if (dto.freight !== undefined) {
      assertNonNegative(dto.freight, 'freight');
      row.freight = dto.freight;
    }
    if (dto.discount !== undefined) {
      assertNonNegative(dto.discount, 'discount');
      row.discount = dto.discount;
    }
    if (dto.items !== undefined) {
      row.items = (await this.buildItems(dto.items)) as PurchaseOrderItem[];
    }

    this.recalculateTotals(row);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order updated',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requirePo(id, actorId, 'read');
    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order fetched',
    );
  }

  async getBalance(id: string, actorId: string) {
    const row = await this.requirePo(id, actorId, 'read');
    const publicPo = toPublicPurchaseOrder(row);
    return createSuccessResponse(
      {
        purchaseOrderId: publicPo.id,
        purchaseOrderNumber: publicPo.purchaseOrderNumber,
        status: publicPo.status,
        balanceQuantity: publicPo.balanceQuantity,
        balanceAmount: publicPo.balanceAmount,
        lines: publicPo.items.map((i) => ({
          lineId: i.id,
          materialId: i.materialId,
          orderedQuantity: i.quantity,
          receivedQuantity: i.receivedQuantity,
          balanceQuantity: i.balanceQuantity,
          lineTotal: i.total,
        })),
      },
      'Purchase order balance fetched',
    );
  }

  async list(query: ListPurchaseOrdersQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'purchase-order' },
      );
    }
    let filter: FilterQuery<PurchaseOrder> = {};
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.purchaseRequestId) {
      filter.purchaseRequestId = new Types.ObjectId(query.purchaseRequestId);
    }
    if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      filter.purchaseOrderNumber = {
        $regex: query.search.trim(),
        $options: 'i',
      };
    }

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.poModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.poModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicPurchaseOrder(item)),
      'Purchase orders fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async submitForApproval(id: string, actorId: string) {
    const row = await this.requirePo(id, actorId, 'update');
    if (
      row.status !== PurchaseOrderStatus.Draft &&
      row.status !== PurchaseOrderStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected POs can be submitted for approval',
      );
    }
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }

    const approval = await this.approvalsService.create(
      String(row.projectId),
      {
        module: PURCHASE_ORDER_APPROVAL_MODULE,
        entityType: PURCHASE_ORDER_APPROVAL_ENTITY,
        entityId: String(row._id),
        amount: row.total,
        reason: `PO ${row.purchaseOrderNumber} revision ${row.revisionNumber}`,
        submit: true,
      },
      actorId,
    );

    row.approvalRequestId = new Types.ObjectId(approval.data!.id);
    row.status = PurchaseOrderStatus.PendingApproval;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order submitted for approval',
    );
  }

  async approve(id: string, dto: ApprovePurchaseOrderDto, actorId: string) {
    const row = await this.requirePo(id, actorId, 'approve');
    if (row.status !== PurchaseOrderStatus.PendingApproval) {
      throw new BadRequestException(
        'Only POs pending approval can be approved',
      );
    }
    if (!row.approvalRequestId) {
      throw new BadRequestException('Approval request is missing');
    }

    const approval = await this.approvalsService.approve(
      String(row.projectId),
      String(row.approvalRequestId),
      actorId,
      { comment: dto.comment ?? 'Purchase order approved' },
    );

    // Multi-step workflows may still be pending; only issue when fully approved
    if (approval.data?.status === ApprovalStatus.Approved) {
      row.status = PurchaseOrderStatus.Issued;
      row.issuedBy = new Types.ObjectId(actorId);
      row.issuedAt = new Date();
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      row.status === PurchaseOrderStatus.Issued
        ? 'Purchase order approved and issued'
        : 'Purchase order approval step completed',
    );
  }

  async reject(id: string, dto: RejectPurchaseOrderDto, actorId: string) {
    const row = await this.requirePo(id, actorId, 'approve');
    if (row.status !== PurchaseOrderStatus.PendingApproval) {
      throw new BadRequestException('Only pending-approval POs can be rejected');
    }
    if (row.approvalRequestId) {
      await this.approvalsService.reject(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.reason },
      );
    }
    row.status = PurchaseOrderStatus.Rejected;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order rejected',
    );
  }

  /**
   * Approved/issued PO revisions require versioning — creates a new draft revision
   * and marks the previous revision superseded.
   */
  async revise(id: string, dto: RevisePurchaseOrderDto, actorId: string) {
    const previous = await this.requirePo(id, actorId, 'update');
    if (previous.status !== PurchaseOrderStatus.Issued) {
      throw new BadRequestException(
        'Only issued POs can be revised (versioning required after approval)',
      );
    }

    const orderDate = dto.orderDate
      ? this.parseDate(dto.orderDate, 'orderDate')
      : previous.orderDate;
    const expectedDeliveryDate = dto.expectedDeliveryDate
      ? this.parseDate(dto.expectedDeliveryDate, 'expectedDeliveryDate')
      : previous.expectedDeliveryDate;
    assertOrderDates(orderDate, expectedDeliveryDate);

    const itemInputs =
      dto.items ??
      previous.items.map((i) => ({
        materialId: String(i.materialId),
        quantity: i.quantity,
        unit: i.unit,
        rate: i.rate,
        tax: i.tax,
        discount: i.discount,
      }));
    const built = await this.buildItems(itemInputs);

    const taxes = dto.taxes ?? previous.taxes;
    const freight = dto.freight ?? previous.freight;
    const discount = dto.discount ?? previous.discount;
    const subtotal = roundMoney(built.reduce((s, i) => s + i.total, 0));
    const total = computePoTotal({ subtotal, taxes, freight, discount });
    const balances = this.computeHeaderBalances(built);

    const purchaseOrderNumber = await this.numberingService.nextCode(
      NumberEntityType.PURCHASE_ORDER,
      {
        asOf: orderDate,
        projectId: String(previous.projectId),
        projectScoped: true,
      },
    );

    const rootId =
      previous.rootPurchaseOrderId ?? (previous._id as Types.ObjectId);

    previous.status = PurchaseOrderStatus.Superseded;
    previous.set('updatedBy', new Types.ObjectId(actorId));
    await previous.save();

    const row = await this.poModel.create({
      purchaseOrderNumber,
      projectId: previous.projectId,
      purchaseRequestId: previous.purchaseRequestId,
      selectedQuotationId: previous.selectedQuotationId,
      vendorId: previous.vendorId,
      orderDate,
      expectedDeliveryDate,
      billingAddress: dto.billingAddress
        ? toAddressEmbed(dto.billingAddress)
        : previous.billingAddress,
      deliveryAddress: dto.deliveryAddress
        ? toAddressEmbed(dto.deliveryAddress)
        : previous.deliveryAddress,
      paymentTerms:
        dto.paymentTerms !== undefined
          ? dto.paymentTerms?.trim() || null
          : previous.paymentTerms,
      items: built,
      subtotal,
      taxes,
      freight,
      discount,
      total,
      terms:
        dto.terms !== undefined ? dto.terms?.trim() || null : previous.terms,
      status: PurchaseOrderStatus.Draft,
      revisionNumber: previous.revisionNumber + 1,
      rootPurchaseOrderId: rootId,
      revisedFromId: previous._id,
      balanceQuantity: balances.balanceQuantity,
      balanceAmount: balances.balanceAmount,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order revised (new draft version; re-approval required)',
    );
  }

  async recordReceipt(
    id: string,
    dto: ReceivePurchaseOrderDto,
    actorId: string,
  ) {
    const row = await this.requirePo(id, actorId, 'update');
    if (
      row.status !== PurchaseOrderStatus.Issued &&
      row.status !== PurchaseOrderStatus.PartiallyReceived
    ) {
      throw new BadRequestException(
        'Receipts can only be recorded against issued or partially received POs',
      );
    }

    const tolerance = this.getReceiveTolerancePercent();
    const byId = new Map(
      row.items.map((item) => [String(item._id), item]),
    );

    for (const input of dto.items) {
      const line = byId.get(input.lineId);
      if (!line) {
        throw new BadRequestException(`Unknown PO line ${input.lineId}`);
      }
      assertReceivableQuantity({
        orderedQuantity: line.quantity,
        alreadyReceived: line.receivedQuantity,
        receiveNow: input.receivedQuantity,
        tolerancePercent: tolerance,
        materialLabel: line.materialCode ?? line.materialName ?? undefined,
      });
      line.receivedQuantity = roundMoney(
        line.receivedQuantity + input.receivedQuantity,
      );
      line.balanceQuantity = computeBalanceQuantity(
        line.quantity,
        line.receivedQuantity,
      );
    }

    const headerBalances = this.computeHeaderBalances(row.items);
    row.balanceQuantity = headerBalances.balanceQuantity;
    row.balanceAmount = headerBalances.balanceAmount;
    row.status = this.resolveReceiptStatus(row.items);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order receipt recorded',
    );
  }

  async close(id: string, actorId: string) {
    const row = await this.requirePo(id, actorId, 'update');
    if (
      row.status !== PurchaseOrderStatus.FullyReceived &&
      row.status !== PurchaseOrderStatus.PartiallyReceived &&
      row.status !== PurchaseOrderStatus.Issued
    ) {
      throw new BadRequestException(
        'Only issued or received POs can be closed',
      );
    }
    row.status = PurchaseOrderStatus.Closed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order closed',
    );
  }

  /**
   * Vendor portal acceptance of an issued PO for the given vendor.
   */
  async acceptByVendor(id: string, vendorId: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase order id');
    }
    const row = await this.poModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Purchase order not found');
    }
    if (String(row.vendorId) !== vendorId) {
      throw new BadRequestException(
        'Purchase order does not belong to this vendor',
      );
    }
    if (
      row.status !== PurchaseOrderStatus.Issued &&
      row.status !== PurchaseOrderStatus.PartiallyReceived
    ) {
      throw new BadRequestException(
        'Only issued purchase orders can be accepted by the vendor',
      );
    }
    if (row.vendorAcceptedAt) {
      return createSuccessResponse(
        toPublicPurchaseOrder(row),
        'Purchase order already accepted',
      );
    }
    row.vendorAcceptedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order accepted by vendor',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requirePo(id, actorId, 'update');
    if (
      row.status === PurchaseOrderStatus.Closed ||
      row.status === PurchaseOrderStatus.Cancelled ||
      row.status === PurchaseOrderStatus.Superseded ||
      row.status === PurchaseOrderStatus.FullyReceived
    ) {
      throw new BadRequestException('Purchase order cannot be cancelled');
    }
    if (
      row.status === PurchaseOrderStatus.PartiallyReceived &&
      row.items.some((i) => i.receivedQuantity > 0)
    ) {
      throw new BadRequestException(
        'Partially received POs with receipts cannot be cancelled; close instead',
      );
    }
    row.status = PurchaseOrderStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicPurchaseOrder(row),
      'Purchase order cancelled',
    );
  }

  async exportPdf(id: string, actorId: string) {
    const row = await this.requirePo(id, actorId, 'read');
    const pdfPath = await this.pdfService.generate(toPublicPurchaseOrder(row));
    row.pdfPath = pdfPath;
    row.pdfGeneratedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      { ...toPublicPurchaseOrder(row), downloadPath: pdfPath },
      'Purchase order PDF generated',
    );
  }

  private getReceiveTolerancePercent(): number {
    const value = this.configService.get('purchaseOrderReceiveTolerancePercent', {
      infer: true,
    });
    return Number.isFinite(value)
      ? Number(value)
      : DEFAULT_RECEIVE_TOLERANCE_PERCENT;
  }

  private resolveReceiptStatus(
    items: PurchaseOrderItem[],
  ): PurchaseOrderStatus {
    const allFullyCovered = items.every(
      (i) => i.receivedQuantity + 1e-9 >= i.quantity,
    );
    const anyReceived = items.some((i) => i.receivedQuantity > 0);
    if (allFullyCovered) return PurchaseOrderStatus.FullyReceived;
    if (anyReceived) return PurchaseOrderStatus.PartiallyReceived;
    return PurchaseOrderStatus.Issued;
  }

  private recalculateTotals(row: PurchaseOrder): void {
    const subtotal = roundMoney(
      (row.items ?? []).reduce((s, i) => s + i.total, 0),
    );
    row.subtotal = subtotal;
    row.total = computePoTotal({
      subtotal,
      taxes: row.taxes,
      freight: row.freight,
      discount: row.discount,
    });
    const balances = this.computeHeaderBalances(row.items);
    row.balanceQuantity = balances.balanceQuantity;
    row.balanceAmount = balances.balanceAmount;
  }

  private computeHeaderBalances(items: PurchaseOrderItem[]) {
    const balanceQuantity = roundMoney(
      items.reduce((s, i) => s + computeBalanceQuantity(i.quantity, i.receivedQuantity), 0),
    );
    const balanceAmount = estimateBalanceAmount(items);
    return { balanceQuantity, balanceAmount };
  }

  private async buildItems(inputs: PurchaseOrderItemInputDto[]) {
    if (!inputs.length) {
      throw new BadRequestException('At least one item is required');
    }
    const items: PurchaseOrderItem[] = [];
    for (const input of inputs) {
      const material = await this.requireActiveMaterial(input.materialId);
      assertPositiveQuantity(input.quantity);
      assertMaterialUnitAllowed(input.unit, material);
      const tax = input.tax ?? 0;
      const discount = input.discount ?? 0;
      const total = computeLineTotal({
        quantity: input.quantity,
        rate: input.rate,
        tax,
        discount,
      });
      items.push({
        materialId: material._id as Types.ObjectId,
        materialCode: material.materialCode,
        materialName: material.name,
        quantity: input.quantity,
        unit: input.unit,
        rate: roundMoney(input.rate),
        tax: roundMoney(tax),
        discount: roundMoney(discount),
        total,
        receivedQuantity: 0,
        balanceQuantity: input.quantity,
      });
    }
    return items;
  }

  private assertDraftEditable(row: PurchaseOrder): void {
    if (row.status !== PurchaseOrderStatus.Draft) {
      throw new BadRequestException(
        'Only draft POs can be edited; revise issued/approved POs to create a new version',
      );
    }
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async requirePo(
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchase order id');
    }
    const row = await this.poModel.findById(id).exec();
    if (!row) throw new NotFoundException('Purchase order not found');
    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        String(row.projectId),
        action,
        { resourceType: 'purchase-order', resourceId: id },
      );
    }
    return row;
  }

  private async requireProject(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireEligiblePurchaseRequest(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchaseRequestId');
    }
    const pr = await this.purchaseRequestModel.findById(id).exec();
    if (!pr) throw new NotFoundException('Purchase request not found');
    if (
      pr.status !== PurchaseRequestStatus.Approved &&
      pr.status !== PurchaseRequestStatus.Sourcing
    ) {
      throw new BadRequestException(
        'PO requires an approved or sourcing purchase request',
      );
    }
    return pr;
  }

  private async requireUsableQuotation(
    quotationId: string,
    purchaseRequestId: string,
  ) {
    if (!Types.ObjectId.isValid(quotationId)) {
      throw new BadRequestException('Invalid selectedQuotationId');
    }
    const quotation = await this.quotationModel.findById(quotationId).exec();
    if (!quotation) throw new NotFoundException('Vendor quotation not found');
    if (String(quotation.purchaseRequestId) !== purchaseRequestId) {
      throw new BadRequestException(
        'selectedQuotationId must belong to the purchase request',
      );
    }
    if (
      quotation.status !== VendorQuotationStatus.Submitted &&
      quotation.status !== VendorQuotationStatus.Final
    ) {
      throw new BadRequestException(
        'Selected quotation must be submitted or final',
      );
    }
    return quotation;
  }

  private async requireActiveVendor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendorId');
    }
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (
      vendor.status === VendorStatus.Blocked ||
      vendor.status === VendorStatus.Inactive
    ) {
      throw new BadRequestException('Vendor is blocked or inactive');
    }
    return vendor;
  }

  private async requireActiveMaterial(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid materialId');
    }
    const material = await this.materialModel.findById(id).exec();
    if (!material) throw new NotFoundException('Material not found');
    if (material.status !== MaterialStatus.Active) {
      throw new BadRequestException('Material is not active');
    }
    return material;
  }
}
