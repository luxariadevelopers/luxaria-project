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
import { ApprovalsService } from '../approvals/approvals.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  VendorQuotation,
  VendorQuotationStatus,
} from '../vendor-quotations/schemas/vendor-quotation.schema';
import { Vendor } from '../vendors/schemas/vendor.schema';
import type {
  GenerateQuotationComparisonDto,
  ListQuotationComparisonsQueryDto,
  RecommendQuotationComparisonDto,
  VendorHistoryOverrideDto,
} from './dto/quotation-comparison.dto';
import { QuotationComparisonPdfService } from './quotation-comparison-pdf.service';
import { toPublicQuotationComparison } from './quotation-comparisons.mapper';
import {
  assertRecommendationReason,
  assertScoreOptional,
  computeBaseMaterialRate,
  computeGst,
  computeTotalDiscount,
  roundMoney,
} from './quotation-comparisons.validation';
import {
  QuotationComparison,
  QuotationComparisonStatus,
  type ComparisonVendorRow,
} from './schemas/quotation-comparison.schema';

export const QUOTATION_COMPARISON_APPROVAL_MODULE = 'procurement';
export const QUOTATION_COMPARISON_APPROVAL_ENTITY = 'quotation_comparison';

@Injectable()
export class QuotationComparisonsService {
  constructor(
    @InjectModel(QuotationComparison.name)
    private readonly comparisonModel: Model<QuotationComparison>,
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseRequestModel: Model<PurchaseRequest>,
    @InjectModel(VendorQuotation.name)
    private readonly quotationModel: Model<VendorQuotation>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    private readonly numberingService: NumberingService,
    private readonly approvalsService: ApprovalsService,
    private readonly pdfService: QuotationComparisonPdfService,
  ) {}

  /**
   * Generate a persisted comparison statement from latest quotations per vendor.
   */
  async generate(dto: GenerateQuotationComparisonDto, actorId: string) {
    const pr = await this.requirePurchaseRequest(dto.purchaseRequestId);
    if (
      pr.status !== PurchaseRequestStatus.Approved &&
      pr.status !== PurchaseRequestStatus.Sourcing
    ) {
      throw new BadRequestException(
        'Comparison can only be generated for approved or sourcing purchase requests',
      );
    }

    const quotations = await this.loadLatestQuotationsPerVendor(
      dto.purchaseRequestId,
    );
    if (quotations.length < 2) {
      throw new BadRequestException(
        'At least two vendor quotations are required to generate a comparison',
      );
    }

    const historyMap = this.buildHistoryMap(dto.vendorHistory);
    const vendorRows = await this.buildVendorRows(quotations, historyMap);

    let lowestLandedCost = Number.POSITIVE_INFINITY;
    let lowestQuotationId: Types.ObjectId | null = null;
    for (const row of vendorRows) {
      if (row.netLandedCost < lowestLandedCost) {
        lowestLandedCost = row.netLandedCost;
        lowestQuotationId = row.quotationId;
      }
    }
    for (const row of vendorRows) {
      row.isLowestLandedCost =
        lowestQuotationId != null &&
        String(row.quotationId) === String(lowestQuotationId);
    }

    const comparisonNumber = await this.numberingService.nextCode(
      NumberEntityType.QUOTATION_COMPARISON,
      {
        asOf: new Date(),
        projectId: String(pr.projectId),
        projectScoped: true,
      },
    );

    const now = new Date();
    const row = await this.comparisonModel.create({
      comparisonNumber,
      purchaseRequestId: pr._id,
      projectId: pr.projectId,
      vendors: vendorRows,
      status: QuotationComparisonStatus.Draft,
      lowestLandedCostQuotationId: lowestQuotationId,
      recommendedQuotationId: null,
      recommendedVendorId: null,
      recommendationReason: null,
      isLowestVendorSelected: false,
      generatedBy: new Types.ObjectId(actorId),
      generatedAt: now,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicQuotationComparison(row),
      'Quotation comparison statement generated',
    );
  }

  async getById(id: string) {
    const row = await this.requireComparison(id);
    return createSuccessResponse(
      toPublicQuotationComparison(row),
      'Quotation comparison fetched',
    );
  }

  async list(query: ListQuotationComparisonsQueryDto) {
    const filter: FilterQuery<QuotationComparison> = {};
    if (query.purchaseRequestId) {
      filter.purchaseRequestId = new Types.ObjectId(query.purchaseRequestId);
    }
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.status) filter.status = query.status;
    if (query.search?.trim()) {
      filter.comparisonNumber = {
        $regex: query.search.trim(),
        $options: 'i',
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.comparisonModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.comparisonModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicQuotationComparison(item)),
      'Quotation comparisons fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async recommend(
    id: string,
    dto: RecommendQuotationComparisonDto,
    actorId: string,
  ) {
    const row = await this.requireComparison(id);
    if (
      row.status !== QuotationComparisonStatus.Draft &&
      row.status !== QuotationComparisonStatus.Recommended
    ) {
      throw new BadRequestException(
        'Recommendation can only be set on draft or recommended comparisons',
      );
    }

    const vendorRow = row.vendors.find(
      (v) => String(v.quotationId) === dto.quotationId,
    );
    if (!vendorRow) {
      throw new BadRequestException(
        'quotationId is not part of this comparison statement',
      );
    }

    const lowest = row.vendors.reduce(
      (min, v) => (v.netLandedCost < min.netLandedCost ? v : min),
      row.vendors[0]!,
    );

    const checked = assertRecommendationReason({
      recommendedLandedCost: vendorRow.netLandedCost,
      lowestLandedCost: lowest.netLandedCost,
      reason: dto.reason,
    });

    for (const v of row.vendors) {
      v.isRecommended = String(v.quotationId) === dto.quotationId;
    }

    row.recommendedQuotationId = vendorRow.quotationId;
    row.recommendedVendorId = vendorRow.vendorId;
    row.recommendationReason = checked.reason;
    row.isLowestVendorSelected = checked.isLowestVendorSelected;
    row.recommendedBy = new Types.ObjectId(actorId);
    row.recommendedAt = new Date();
    row.status = QuotationComparisonStatus.Recommended;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicQuotationComparison(row),
      'Vendor recommendation recorded',
    );
  }

  async submitForApproval(id: string, actorId: string) {
    const row = await this.requireComparison(id);
    if (row.status !== QuotationComparisonStatus.Recommended) {
      throw new BadRequestException(
        'Set a recommendation before submitting for approval',
      );
    }
    if (!row.recommendedQuotationId) {
      throw new BadRequestException('recommendedQuotationId is required');
    }

    const recommended = row.vendors.find((v) => v.isRecommended);
    const amount = recommended?.netLandedCost ?? 0;
    const reasonParts = [
      `Comparison ${row.comparisonNumber}`,
      recommended
        ? `Recommend ${recommended.vendorName ?? recommended.vendorCode ?? recommended.vendorId}`
        : null,
      row.isLowestVendorSelected
        ? 'Lowest landed cost selected'
        : `Not lowest: ${row.recommendationReason}`,
    ].filter(Boolean);

    const approval = await this.approvalsService.create(
      String(row.projectId),
      {
        module: QUOTATION_COMPARISON_APPROVAL_MODULE,
        entityType: QUOTATION_COMPARISON_APPROVAL_ENTITY,
        entityId: String(row._id),
        amount,
        reason: reasonParts.join(' — '),
        submit: true,
      },
      actorId,
    );

    row.approvalRequestId = new Types.ObjectId(approval.data!.id);
    row.status = QuotationComparisonStatus.PendingApproval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicQuotationComparison(row),
      'Comparison recommendation submitted for approval',
    );
  }

  async exportPdf(id: string, actorId: string) {
    const row = await this.requireComparison(id);
    const publicRow = toPublicQuotationComparison(row);
    const pdfPath = await this.pdfService.generate(publicRow);

    row.pdfPath = pdfPath;
    row.pdfGeneratedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      {
        ...toPublicQuotationComparison(row),
        downloadPath: pdfPath,
      },
      'Comparison PDF exported',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireComparison(id);
    if (
      row.status === QuotationComparisonStatus.Approved ||
      row.status === QuotationComparisonStatus.Cancelled
    ) {
      throw new BadRequestException('Comparison cannot be cancelled');
    }
    row.status = QuotationComparisonStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicQuotationComparison(row),
      'Quotation comparison cancelled',
    );
  }

  private async loadLatestQuotationsPerVendor(purchaseRequestId: string) {
    const rows = await this.quotationModel
      .find({
        purchaseRequestId: new Types.ObjectId(purchaseRequestId),
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

    const latestByVendor = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = String(row.vendorId);
      if (!latestByVendor.has(key)) {
        latestByVendor.set(key, row);
      }
    }
    return [...latestByVendor.values()];
  }

  private buildHistoryMap(overrides?: VendorHistoryOverrideDto[]) {
    const map = new Map<
      string,
      {
        previousQuality: number | null;
        previousDeliveryPerformance: number | null;
      }
    >();
    for (const item of overrides ?? []) {
      assertScoreOptional(item.previousQuality, 'previousQuality');
      assertScoreOptional(
        item.previousDeliveryPerformance,
        'previousDeliveryPerformance',
      );
      map.set(item.vendorId, {
        previousQuality: item.previousQuality ?? null,
        previousDeliveryPerformance: item.previousDeliveryPerformance ?? null,
      });
    }
    return map;
  }

  private async buildVendorRows(
    quotations: Array<VendorQuotation & { _id: Types.ObjectId }>,
    historyMap: Map<
      string,
      {
        previousQuality: number | null;
        previousDeliveryPerformance: number | null;
      }
    >,
  ): Promise<ComparisonVendorRow[]> {
    const rows: ComparisonVendorRow[] = [];

    for (const q of quotations) {
      if (!q.items?.length) {
        throw new BadRequestException(
          `Quotation ${q.quotationNumber} has no items`,
        );
      }

      const vendor = await this.vendorModel.findById(q.vendorId).exec();
      if (!vendor) {
        throw new NotFoundException(
          `Vendor not found for quotation ${q.quotationNumber}`,
        );
      }

      const history = historyMap.get(String(q.vendorId));
      const baseMaterialRate = computeBaseMaterialRate(
        q.items.map((i) => ({ quantity: i.quantity, rate: i.rate })),
      );
      const gst = computeGst({
        lineTaxes: q.items.map((i) => i.tax),
        headerTaxes: q.taxes,
      });
      const discount = computeTotalDiscount({
        lineDiscounts: q.items.map((i) => i.discount),
        headerDiscount: q.discount,
      });

      rows.push({
        quotationId: q._id,
        quotationNumber: q.quotationNumber,
        vendorId: q.vendorId,
        vendorCode: vendor.vendorCode,
        vendorName: vendor.tradeName || vendor.legalName,
        baseMaterialRate,
        gst,
        freight: roundMoney(q.freight),
        discount,
        netLandedCost: roundMoney(q.grandTotal),
        deliveryDays: q.deliveryDays,
        paymentTerms: q.paymentTerms ?? vendor.paymentTerms ?? null,
        vendorRating: vendor.rating ?? null,
        previousQuality: history?.previousQuality ?? null,
        previousDeliveryPerformance:
          history?.previousDeliveryPerformance ?? null,
        isLowestLandedCost: false,
        isRecommended: false,
      });
    }

    return rows;
  }

  private async requireComparison(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid comparison id');
    }
    const row = await this.comparisonModel.findById(id).exec();
    if (!row) throw new NotFoundException('Quotation comparison not found');
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
}
