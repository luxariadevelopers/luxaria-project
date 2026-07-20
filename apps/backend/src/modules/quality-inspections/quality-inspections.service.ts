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
  GoodsReceipt,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import { GoodsReceiptsService } from '../goods-receipts/goods-receipts.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import type {
  CompleteQualityInspectionDto,
  CreateQualityInspectionDto,
  ListQualityInspectionsQueryDto,
  QualityTestParameterDto,
  UpdateQualityInspectionDto,
} from './dto/quality-inspection.dto';
import {
  toPublicQualityInspection,
  toPublicVendorQualityScore,
} from './quality-inspections.mapper';
import {
  assertLineDecision,
  assertResultMatchesLines,
  computeVendorQualityScore,
  roundQty,
} from './quality-inspections.validation';
import {
  QualityInspection,
  QualityInspectionResult,
  QualityInspectionStatus,
  type QualityInspectionLine,
} from './schemas/quality-inspection.schema';
import { VendorQualityScore } from './schemas/vendor-quality-score.schema';

@Injectable()
export class QualityInspectionsService {
  constructor(
    @InjectModel(QualityInspection.name)
    private readonly inspectionModel: Model<QualityInspection>,
    @InjectModel(VendorQualityScore.name)
    private readonly scoreModel: Model<VendorQualityScore>,
    @InjectModel(GoodsReceipt.name)
    private readonly grnModel: Model<GoodsReceipt>,
    private readonly numberingService: NumberingService,
    private readonly goodsReceiptsService: GoodsReceiptsService,
  ) {}

  async create(dto: CreateQualityInspectionDto, actorId: string) {
    const grn = await this.requireInspectableGrn(dto.grnId);

    const open = await this.inspectionModel
      .findOne({
        grnId: grn._id,
        status: {
          $in: [
            QualityInspectionStatus.Draft,
            QualityInspectionStatus.InProgress,
          ],
        },
      })
      .exec();
    if (open) {
      throw new BadRequestException(
        'An open quality inspection already exists for this GRN',
      );
    }

    if (grn.status === GoodsReceiptStatus.Submitted) {
      await this.goodsReceiptsService.startQualityCheck(
        String(grn._id),
        actorId,
      );
    }

    const inspectionDate = this.parseDate(dto.inspectionDate, 'inspectionDate');
    const inspectionNumber = await this.numberingService.nextCode(
      NumberEntityType.QUALITY_INSPECTION,
      {
        asOf: inspectionDate,
        projectId: String(grn.projectId),
        projectScoped: true,
      },
    );

    const items: QualityInspectionLine[] = (grn.items ?? []).map((line) => ({
      grnLineId: line._id as Types.ObjectId,
      materialId: line.materialId,
      materialCode: line.materialCode,
      materialName: line.materialName,
      receivedQuantity: line.receivedQuantity,
      acceptedQuantity: null,
      rejectedQuantity: null,
      rejectionReason: null,
    }));

    const row = await this.inspectionModel.create({
      inspectionNumber,
      grnId: grn._id,
      projectId: grn.projectId,
      vendorId: grn.vendorId,
      inspector: new Types.ObjectId(actorId),
      inspectionDate,
      testParameters: this.normalizeParameters(dto.testParameters),
      items,
      samplePhotos: dto.samplePhotos ?? [],
      testDocuments: dto.testDocuments ?? [],
      result: null,
      remarks: dto.remarks?.trim() || null,
      status: QualityInspectionStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicQualityInspection(row),
      'Quality inspection created as draft',
    );
  }

  async update(id: string, dto: UpdateQualityInspectionDto, actorId: string) {
    const row = await this.requireInspection(id);
    if (
      row.status !== QualityInspectionStatus.Draft &&
      row.status !== QualityInspectionStatus.InProgress
    ) {
      throw new BadRequestException(
        'Only draft or in-progress inspections can be updated',
      );
    }

    if (dto.inspectionDate !== undefined) {
      row.inspectionDate = this.parseDate(dto.inspectionDate, 'inspectionDate');
    }
    if (dto.testParameters !== undefined) {
      row.testParameters = this.normalizeParameters(dto.testParameters);
    }
    if (dto.samplePhotos !== undefined) row.samplePhotos = dto.samplePhotos;
    if (dto.testDocuments !== undefined) row.testDocuments = dto.testDocuments;
    if (dto.remarks !== undefined) row.remarks = dto.remarks?.trim() || null;

    if (row.status === QualityInspectionStatus.Draft) {
      row.status = QualityInspectionStatus.InProgress;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicQualityInspection(row),
      'Quality inspection updated',
    );
  }

  async getById(id: string) {
    const row = await this.requireInspection(id);
    return createSuccessResponse(
      toPublicQualityInspection(row),
      'Quality inspection fetched',
    );
  }

  async list(query: ListQualityInspectionsQueryDto) {
    const filter: FilterQuery<QualityInspection> = {};
    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.grnId) filter.grnId = new Types.ObjectId(query.grnId);
    if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);
    if (query.status) filter.status = query.status;
    if (query.result) filter.result = query.result;
    if (query.search?.trim()) {
      filter.inspectionNumber = {
        $regex: query.search.trim(),
        $options: 'i',
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.inspectionModel
        .find(filter)
        .sort({ createdAt: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.inspectionModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicQualityInspection(item)),
      'Quality inspections fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Complete inspection: apply result to GRN (rejected stock never becomes available)
   * and refresh vendor quality score.
   */
  async complete(
    id: string,
    dto: CompleteQualityInspectionDto,
    actorId: string,
  ) {
    const row = await this.requireInspection(id);
    if (
      row.status !== QualityInspectionStatus.Draft &&
      row.status !== QualityInspectionStatus.InProgress
    ) {
      throw new BadRequestException(
        'Only draft or in-progress inspections can be completed',
      );
    }

    if (dto.testParameters !== undefined) {
      row.testParameters = this.normalizeParameters(dto.testParameters);
    }
    if (dto.samplePhotos !== undefined) row.samplePhotos = dto.samplePhotos;
    if (dto.testDocuments !== undefined) row.testDocuments = dto.testDocuments;
    if (dto.remarks !== undefined) row.remarks = dto.remarks?.trim() || null;

    const lineInputs = dto.items ?? [];
    assertResultMatchesLines({
      result: dto.result,
      items: lineInputs.map((i) => ({
        acceptedQuantity: i.acceptedQuantity,
        rejectedQuantity: i.rejectedQuantity,
      })),
    });

    if (dto.result !== QualityInspectionResult.Hold) {
      const byGrnLine = new Map(
        row.items.map((item) => [String(item.grnLineId), item]),
      );

      for (const input of lineInputs) {
        const line = byGrnLine.get(input.grnLineId);
        if (!line) {
          throw new BadRequestException(
            `Unknown GRN line ${input.grnLineId} on this inspection`,
          );
        }
        assertLineDecision({
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: input.acceptedQuantity,
          rejectedQuantity: input.rejectedQuantity,
          rejectionReason: input.rejectionReason,
        });
        line.acceptedQuantity = roundQty(input.acceptedQuantity);
        line.rejectedQuantity = roundQty(input.rejectedQuantity);
        line.rejectionReason =
          input.rejectedQuantity > 0
            ? input.rejectionReason?.trim() || null
            : null;
      }

      // Lines not in payload: fully accept for Accepted; for Rejected must all be listed
      if (dto.result === QualityInspectionResult.Accepted) {
        for (const line of row.items) {
          if (line.acceptedQuantity == null) {
            line.acceptedQuantity = line.receivedQuantity;
            line.rejectedQuantity = 0;
            line.rejectionReason = null;
          }
        }
      } else if (dto.result === QualityInspectionResult.Rejected) {
        for (const line of row.items) {
          if (line.rejectedQuantity == null) {
            throw new BadRequestException(
              'All GRN lines must be included when rejecting',
            );
          }
        }
      } else if (dto.result === QualityInspectionResult.PartiallyAccepted) {
        for (const line of row.items) {
          if (line.acceptedQuantity == null) {
            throw new BadRequestException(
              'All GRN lines must be decided for partial acceptance',
            );
          }
        }
      }

      await this.goodsReceiptsService.applyInspectionResult(
        String(row.grnId),
        {
          items: row.items.map((line) => ({
            lineId: String(line.grnLineId),
            acceptedQuantity: line.acceptedQuantity ?? 0,
            rejectedQuantity: line.rejectedQuantity ?? 0,
            rejectionReason: line.rejectionReason,
          })),
          allowFullReject: dto.result === QualityInspectionResult.Rejected,
          forceStatus:
            dto.result === QualityInspectionResult.Accepted
              ? GoodsReceiptStatus.Accepted
              : dto.result === QualityInspectionResult.PartiallyAccepted
                ? GoodsReceiptStatus.PartiallyAccepted
                : GoodsReceiptStatus.Rejected,
        },
        actorId,
      );
    } else {
      await this.goodsReceiptsService.applyInspectionResult(
        String(row.grnId),
        { items: [], hold: true },
        actorId,
      );
    }

    row.result = dto.result;
    row.status = QualityInspectionStatus.Completed;
    row.completedBy = new Types.ObjectId(actorId);
    row.completedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    const score = await this.recomputeVendorScore(
      String(row.vendorId),
      String(row._id),
      row.completedAt,
    );

    return createSuccessResponse(
      {
        inspection: toPublicQualityInspection(row),
        vendorQualityScore: toPublicVendorQualityScore(score),
      },
      'Quality inspection completed',
    );
  }

  async getVendorQualityScore(vendorId: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendorId');
    }
    const existing = await this.scoreModel
      .findOne({ vendorId: new Types.ObjectId(vendorId) })
      .exec();
    const row =
      existing ?? (await this.recomputeVendorScore(vendorId, null, null));
    return createSuccessResponse(
      toPublicVendorQualityScore(row),
      'Vendor quality score fetched',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireInspection(id);
    if (row.status === QualityInspectionStatus.Completed) {
      throw new BadRequestException('Completed inspections cannot be cancelled');
    }
    row.status = QualityInspectionStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicQualityInspection(row),
      'Quality inspection cancelled',
    );
  }

  private async recomputeVendorScore(
    vendorId: string,
    lastInspectionId: string | null,
    lastInspectionAt: Date | null,
  ) {
    const completed = await this.inspectionModel
      .find({
        vendorId: new Types.ObjectId(vendorId),
        status: QualityInspectionStatus.Completed,
        result: { $ne: null },
      })
      .select('result completedAt')
      .lean()
      .exec();

    const counts = {
      acceptedCount: 0,
      partiallyAcceptedCount: 0,
      rejectedCount: 0,
      holdCount: 0,
    };
    for (const row of completed) {
      switch (row.result) {
        case QualityInspectionResult.Accepted:
          counts.acceptedCount += 1;
          break;
        case QualityInspectionResult.PartiallyAccepted:
          counts.partiallyAcceptedCount += 1;
          break;
        case QualityInspectionResult.Rejected:
          counts.rejectedCount += 1;
          break;
        case QualityInspectionResult.Hold:
          counts.holdCount += 1;
          break;
        default:
          break;
      }
    }

    const computed = computeVendorQualityScore(counts);
    const latest =
      lastInspectionAt ??
      completed
        .map((c) => c.completedAt)
        .filter((d): d is Date => Boolean(d))
        .sort((a, b) => b.getTime() - a.getTime())[0] ??
      null;

    const updated = await this.scoreModel
      .findOneAndUpdate(
        { vendorId: new Types.ObjectId(vendorId) },
        {
          $set: {
            ...counts,
            score: computed.score,
            ratingEquivalent: computed.ratingEquivalent,
            inspectionsCount: computed.inspectionsCount,
            lastInspectionAt: latest,
            lastInspectionId: lastInspectionId
              ? new Types.ObjectId(lastInspectionId)
              : null,
          },
          $setOnInsert: {
            vendorId: new Types.ObjectId(vendorId),
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    if (!updated) {
      throw new BadRequestException('Failed to update vendor quality score');
    }
    return updated;
  }

  private normalizeParameters(params?: QualityTestParameterDto[]) {
    return (params ?? []).map((p) => ({
      name: p.name.trim(),
      expectedValue: p.expectedValue?.trim() || null,
      actualValue: p.actualValue?.trim() || null,
      unit: p.unit?.trim() || null,
      passed: p.passed ?? null,
      notes: p.notes?.trim() || null,
    }));
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async requireInspection(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid inspection id');
    }
    const row = await this.inspectionModel.findById(id).exec();
    if (!row) throw new NotFoundException('Quality inspection not found');
    return row;
  }

  private async requireInspectableGrn(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid grnId');
    }
    const grn = await this.grnModel.findById(id).exec();
    if (!grn) throw new NotFoundException('Goods receipt not found');
    if (
      grn.status !== GoodsReceiptStatus.Submitted &&
      grn.status !== GoodsReceiptStatus.QualityCheck
    ) {
      throw new BadRequestException(
        'Quality inspection requires a submitted or quality-check GRN',
      );
    }
    return grn;
  }
}
