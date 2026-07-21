import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Material,
  MaterialStatus,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import { RfqService } from '../rfq/rfq.service';
import {
  Vendor,
  VendorStatus,
} from '../vendors/schemas/vendor.schema';
import type {
  CompareVendorQuotationsQueryDto,
  CreateVendorQuotationDto,
  ListVendorQuotationsQueryDto,
  ReviseVendorQuotationDto,
  UpdateVendorQuotationDto,
  VendorQuotationItemInputDto,
} from './dto/vendor-quotation.dto';
import {
  buildQuotationComparison,
  toPublicVendorQuotation,
} from './vendor-quotations.mapper';
import {
  assertMaterialUnitAllowed,
  assertNonNegativeAmount,
  assertPositiveQuantity,
  assertQuotationDates,
  computeGrandTotal,
  computeLineTotal,
  roundMoney,
} from './vendor-quotations.validation';
import {
  VendorQuotation,
  VendorQuotationStatus,
  type QuotationDocumentFile,
  type VendorQuotationItem,
} from './schemas/vendor-quotation.schema';

export type QuotationDocumentUpload = {
  fileName: string;
  filePath: string;
  mimeType: string | null;
  sizeBytes: number;
};

@Injectable()
export class VendorQuotationsService {
  constructor(
    @InjectModel(VendorQuotation.name)
    private readonly quotationModel: Model<VendorQuotation>,
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseRequestModel: Model<PurchaseRequest>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(Material.name) private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly rfqService: RfqService,
  ) {}

  async create(dto: CreateVendorQuotationDto, actorId: string) {
    const pr = await this.requireEligiblePurchaseRequest(dto.purchaseRequestId);
    await this.requireActiveVendor(dto.vendorId);

    let rfqId: Types.ObjectId | null = null;
    if (dto.rfqId) {
      const rfq = await this.rfqService.requireIssuedWithVendor(
        dto.rfqId,
        dto.vendorId,
      );
      if (String(rfq.purchaseRequestId) !== String(pr._id)) {
        throw new BadRequestException(
          'rfqId purchase request does not match purchaseRequestId',
        );
      }
      rfqId = rfq._id as Types.ObjectId;
    }

    const quotationDate = this.parseDate(dto.quotationDate, 'quotationDate');
    const validityDate = this.parseDate(dto.validityDate, 'validityDate');
    assertQuotationDates(quotationDate, validityDate);

    const freight = dto.freight ?? 0;
    const taxes = dto.taxes ?? 0;
    const discount = dto.discount ?? 0;
    assertNonNegativeAmount(freight, 'freight');
    assertNonNegativeAmount(taxes, 'taxes');
    assertNonNegativeAmount(discount, 'discount');

    const built = await this.buildItems(dto.items);
    const itemsSubtotal = roundMoney(
      built.reduce((sum, item) => sum + item.total, 0),
    );
    const grandTotal = computeGrandTotal({
      itemsSubtotal,
      freight,
      taxes,
      discount,
    });

    const quotationNumber = await this.numberingService.nextCode(
      NumberEntityType.VENDOR_QUOTATION,
      {
        asOf: quotationDate,
        projectId: String(pr.projectId),
        projectScoped: true,
      },
    );

    const row = await this.quotationModel.create({
      quotationNumber,
      purchaseRequestId: pr._id,
      rfqId,
      projectId: pr.projectId,
      vendorId: new Types.ObjectId(dto.vendorId),
      quotationDate,
      validityDate,
      deliveryDays: dto.deliveryDays ?? 0,
      paymentTerms: dto.paymentTerms?.trim() || null,
      freight,
      taxes,
      discount,
      items: built,
      quotationDocument: null,
      status: VendorQuotationStatus.Draft,
      revisionNumber: 1,
      rootQuotationId: null,
      revisedFromId: null,
      itemsSubtotal,
      grandTotal,
      createdBy: new Types.ObjectId(actorId),
    });

    row.rootQuotationId = row._id as Types.ObjectId;
    await row.save();

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation created as draft',
    );
  }

  async update(id: string, dto: UpdateVendorQuotationDto, actorId: string) {
    const row = await this.requireQuotation(id);
    this.assertEditable(row);

    if (
      dto.purchaseRequestId &&
      dto.purchaseRequestId !== String(row.purchaseRequestId)
    ) {
      throw new BadRequestException(
        'purchaseRequestId cannot be changed; create a new quotation',
      );
    }
    if (dto.vendorId && dto.vendorId !== String(row.vendorId)) {
      await this.requireActiveVendor(dto.vendorId);
      row.vendorId = new Types.ObjectId(dto.vendorId);
    }
    if (dto.quotationDate !== undefined) {
      row.quotationDate = this.parseDate(dto.quotationDate, 'quotationDate');
    }
    if (dto.validityDate !== undefined) {
      row.validityDate = this.parseDate(dto.validityDate, 'validityDate');
    }
    assertQuotationDates(row.quotationDate, row.validityDate);

    if (dto.deliveryDays !== undefined) row.deliveryDays = dto.deliveryDays;
    if (dto.paymentTerms !== undefined) {
      row.paymentTerms = dto.paymentTerms?.trim() || null;
    }
    if (dto.freight !== undefined) {
      assertNonNegativeAmount(dto.freight, 'freight');
      row.freight = dto.freight;
    }
    if (dto.taxes !== undefined) {
      assertNonNegativeAmount(dto.taxes, 'taxes');
      row.taxes = dto.taxes;
    }
    if (dto.discount !== undefined) {
      assertNonNegativeAmount(dto.discount, 'discount');
      row.discount = dto.discount;
    }
    if (dto.items !== undefined) {
      row.items = (await this.buildItems(dto.items)) as VendorQuotationItem[];
    }

    this.recalculateTotals(row);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation updated',
    );
  }

  async getById(id: string) {
    const row = await this.requireQuotation(id);
    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation fetched',
    );
  }

  async list(query: ListVendorQuotationsQueryDto) {
    const filter: FilterQuery<VendorQuotation> = {};
    if (query.purchaseRequestId) {
      filter.purchaseRequestId = new Types.ObjectId(query.purchaseRequestId);
    }
    if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      const search = query.search.trim();
      filter.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { paymentTerms: { $regex: search, $options: 'i' } },
      ];
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.quotationModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.quotationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicVendorQuotation(item)),
      'Vendor quotations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireQuotation(id);
    if (row.status !== VendorQuotationStatus.Draft) {
      throw new BadRequestException('Only draft quotations can be submitted');
    }
    if (!row.items?.length) {
      throw new BadRequestException('At least one item is required');
    }
    row.status = VendorQuotationStatus.Submitted;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation submitted',
    );
  }

  /**
   * Create a new revision from a submitted/final quotation.
   * Previous revision becomes superseded; new one starts as draft.
   */
  async revise(id: string, dto: ReviseVendorQuotationDto, actorId: string) {
    const previous = await this.requireQuotation(id);
    if (
      previous.status !== VendorQuotationStatus.Submitted &&
      previous.status !== VendorQuotationStatus.Final
    ) {
      throw new BadRequestException(
        'Only submitted or final quotations can be revised',
      );
    }

    const quotationDate = dto.quotationDate
      ? this.parseDate(dto.quotationDate, 'quotationDate')
      : previous.quotationDate;
    const validityDate = dto.validityDate
      ? this.parseDate(dto.validityDate, 'validityDate')
      : previous.validityDate;
    assertQuotationDates(quotationDate, validityDate);

    const vendorId = dto.vendorId ?? String(previous.vendorId);
    if (vendorId !== String(previous.vendorId)) {
      await this.requireActiveVendor(vendorId);
    }

    const freight = dto.freight ?? previous.freight;
    const taxes = dto.taxes ?? previous.taxes;
    const discount = dto.discount ?? previous.discount;
    assertNonNegativeAmount(freight, 'freight');
    assertNonNegativeAmount(taxes, 'taxes');
    assertNonNegativeAmount(discount, 'discount');

    const built = dto.items
      ? await this.buildItems(dto.items)
      : previous.items.map((item) => ({
          materialId: item.materialId,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          tax: item.tax,
          discount: item.discount,
          total: item.total,
        }));

    const itemsSubtotal = roundMoney(
      built.reduce((sum, item) => sum + item.total, 0),
    );
    const grandTotal = computeGrandTotal({
      itemsSubtotal,
      freight,
      taxes,
      discount,
    });

    const quotationNumber = await this.numberingService.nextCode(
      NumberEntityType.VENDOR_QUOTATION,
      {
        asOf: quotationDate,
        projectId: String(previous.projectId),
        projectScoped: true,
      },
    );

    const rootId =
      previous.rootQuotationId ?? (previous._id as Types.ObjectId);

    previous.status = VendorQuotationStatus.Superseded;
    previous.finalizedBy = null;
    previous.finalizedAt = null;
    previous.set('updatedBy', new Types.ObjectId(actorId));
    await previous.save();

    const row = await this.quotationModel.create({
      quotationNumber,
      purchaseRequestId: previous.purchaseRequestId,
      projectId: previous.projectId,
      vendorId: new Types.ObjectId(vendorId),
      quotationDate,
      validityDate,
      deliveryDays: dto.deliveryDays ?? previous.deliveryDays,
      paymentTerms:
        dto.paymentTerms !== undefined
          ? dto.paymentTerms?.trim() || null
          : previous.paymentTerms,
      freight,
      taxes,
      discount,
      items: built,
      quotationDocument: null,
      status: VendorQuotationStatus.Draft,
      revisionNumber: previous.revisionNumber + 1,
      rootQuotationId: rootId,
      revisedFromId: previous._id,
      itemsSubtotal,
      grandTotal,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation revised (new draft revision)',
    );
  }

  async markFinal(id: string, actorId: string) {
    const row = await this.requireQuotation(id);
    if (row.status !== VendorQuotationStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted quotations can be marked final',
      );
    }

    // Clear any other final quote on the same purchase request
    await this.quotationModel
      .updateMany(
        {
          purchaseRequestId: row.purchaseRequestId,
          status: VendorQuotationStatus.Final,
          _id: { $ne: row._id },
        },
        {
          $set: {
            status: VendorQuotationStatus.Submitted,
            finalizedBy: null,
            finalizedAt: null,
            updatedBy: new Types.ObjectId(actorId),
          },
        },
      )
      .exec();

    row.status = VendorQuotationStatus.Final;
    row.finalizedBy = new Types.ObjectId(actorId);
    row.finalizedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation marked as final',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireQuotation(id);
    if (
      row.status !== VendorQuotationStatus.Draft &&
      row.status !== VendorQuotationStatus.Submitted
    ) {
      throw new BadRequestException(
        'Only draft or submitted quotations can be cancelled',
      );
    }
    row.status = VendorQuotationStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation cancelled',
    );
  }

  async uploadDocument(
    id: string,
    file: QuotationDocumentUpload,
    actorId: string,
  ) {
    const row = await this.requireQuotation(id);
    if (
      row.status === VendorQuotationStatus.Cancelled ||
      row.status === VendorQuotationStatus.Superseded
    ) {
      throw new BadRequestException(
        'Cannot upload document to cancelled/superseded quotation',
      );
    }

    const doc: QuotationDocumentFile = {
      fileName: file.fileName,
      filePath: file.filePath,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadedAt: new Date(),
      uploadedBy: new Types.ObjectId(actorId),
    };
    row.quotationDocument = doc;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorQuotation(row),
      'Vendor quotation document uploaded',
    );
  }

  async compare(query: CompareVendorQuotationsQueryDto) {
    if (!Types.ObjectId.isValid(query.purchaseRequestId)) {
      throw new BadRequestException('Invalid purchaseRequestId');
    }
    await this.requirePurchaseRequest(query.purchaseRequestId);

    const rows = await this.quotationModel
      .find({
        purchaseRequestId: new Types.ObjectId(query.purchaseRequestId),
        status: {
          $in: [
            VendorQuotationStatus.Submitted,
            VendorQuotationStatus.Final,
            VendorQuotationStatus.Draft,
          ],
        },
      })
      .sort({ vendorId: 1, revisionNumber: -1, createdAt: -1 })
      .exec();

    // Keep latest revision per vendor for comparison
    const latestByVendor = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = String(row.vendorId);
      if (!latestByVendor.has(key)) {
        latestByVendor.set(key, row);
      }
    }

    const comparison = buildQuotationComparison(
      query.purchaseRequestId,
      [...latestByVendor.values()],
    );

    return createSuccessResponse(
      comparison,
      'Vendor quotations comparison built',
    );
  }

  private recalculateTotals(row: VendorQuotation): void {
    const itemsSubtotal = roundMoney(
      (row.items ?? []).reduce((sum, item) => sum + item.total, 0),
    );
    row.itemsSubtotal = itemsSubtotal;
    row.grandTotal = computeGrandTotal({
      itemsSubtotal,
      freight: row.freight,
      taxes: row.taxes,
      discount: row.discount,
    });
  }

  private async buildItems(inputs: VendorQuotationItemInputDto[]) {
    if (!inputs.length) {
      throw new BadRequestException('At least one item is required');
    }

    const items = [];
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
        materialId: material._id,
        materialCode: material.materialCode,
        materialName: material.name,
        quantity: input.quantity,
        unit: input.unit,
        rate: roundMoney(input.rate),
        tax: roundMoney(tax),
        discount: roundMoney(discount),
        total,
      });
    }
    return items;
  }

  private assertEditable(row: VendorQuotation): void {
    if (row.status !== VendorQuotationStatus.Draft) {
      throw new BadRequestException(
        'Only draft quotations can be edited; revise to create a new version',
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

  private async requireQuotation(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid quotation id');
    }
    const row = await this.quotationModel.findById(id).exec();
    if (!row) throw new NotFoundException('Vendor quotation not found');
    return row;
  }

  private async requirePurchaseRequest(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid purchaseRequestId');
    }
    const pr = await this.purchaseRequestModel.findById(id).exec();
    if (!pr) throw new NotFoundException('Purchase request not found');
    return pr;
  }

  private async requireEligiblePurchaseRequest(id: string) {
    const pr = await this.requirePurchaseRequest(id);
    const allowed: PurchaseRequestStatus[] = [
      PurchaseRequestStatus.Approved,
      PurchaseRequestStatus.Sourcing,
    ];
    if (!allowed.includes(pr.status)) {
      throw new BadRequestException(
        'Quotations can only be added for approved or sourcing purchase requests',
      );
    }
    return pr;
  }

  private async requireActiveVendor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendorId');
    }
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (vendor.status === VendorStatus.Blocked) {
      throw new BadRequestException('Vendor is blocked');
    }
    if (vendor.status === VendorStatus.Inactive) {
      throw new BadRequestException('Vendor is inactive');
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
