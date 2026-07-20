import {
  BadRequestException,
  ForbiddenException,
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
  BoqItem,
  BoqVersion,
  BoqVersionStatus,
} from '../boq/schemas/boq.schema';
import {
  Material,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import {
  MaterialIssue,
  MaterialIssueStatus,
} from '../material-issues/schemas/material-issue.schema';
import {
  MaterialConsumptionStandard,
  MaterialConsumptionStandardStatus,
} from '../material-consumption-standards/schemas/material-consumption-standard.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { PermissionsService } from '../rbac/permissions.service';
import {
  StockCount,
  StockCountStatus,
} from '../stock-counts/schemas/stock-count.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import type {
  ApproveMaterialConsumptionReportDto,
  GenerateMaterialConsumptionReportDto,
  ListMaterialConsumptionReportsQueryDto,
  PreviewMaterialConsumptionQueryDto,
  UpdateMaterialConsumptionReportDto,
} from './dto/material-consumption.dto';
import {
  toPublicMaterialConsumptionLine,
  toPublicMaterialConsumptionReport,
} from './material-consumption.mapper';
import {
  assertVarianceApprovalComment,
  assertVarianceExplained,
  computeConsumptionMetrics,
  evaluateConsumptionAlerts,
  lineKey,
  roundQty,
  varianceRequiresApproval,
} from './material-consumption.validation';
import {
  MaterialConsumptionLine,
  MaterialConsumptionReport,
  MaterialConsumptionReportStatus,
  MaterialConsumptionStandardSource,
} from './schemas/material-consumption-report.schema';

type BuiltLine = MaterialConsumptionLine;

@Injectable()
export class MaterialConsumptionService {
  constructor(
    @InjectModel(MaterialConsumptionReport.name)
    private readonly reportModel: Model<MaterialConsumptionReport>,
    @InjectModel(WorkMeasurement.name)
    private readonly measurementModel: Model<WorkMeasurement>,
    @InjectModel(MaterialIssue.name)
    private readonly issueModel: Model<MaterialIssue>,
    @InjectModel(BoqItem.name)
    private readonly boqItemModel: Model<BoqItem>,
    @InjectModel(BoqVersion.name)
    private readonly boqVersionModel: Model<BoqVersion>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    @InjectModel(MaterialConsumptionStandard.name)
    private readonly standardModel: Model<MaterialConsumptionStandard>,
    @InjectModel(StockCount.name)
    private readonly stockCountModel: Model<StockCount>,
    private readonly numberingService: NumberingService,
    private readonly permissionsService: PermissionsService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async preview(query: PreviewMaterialConsumptionQueryDto) {
    if (!Types.ObjectId.isValid(query.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const lines = await this.buildLines({
      projectId: query.projectId,
      periodFrom: query.periodFrom ?? null,
      periodTo: query.periodTo ?? null,
    });
    return createSuccessResponse(
      {
        projectId: query.projectId,
        periodFrom: query.periodFrom ?? null,
        periodTo: query.periodTo ?? null,
        asOfDate: query.asOfDate ?? query.periodTo ?? new Date().toISOString(),
        lines: lines.map((line) => toPublicMaterialConsumptionLine(line)),
        requiresApproval: lines.some((l) => l.requiresApproval),
      },
      'Material consumption preview computed',
    );
  }

  async generate(dto: GenerateMaterialConsumptionReportDto, actorId: string) {
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    const periodFrom = this.parseOptionalDate(dto.periodFrom, 'periodFrom');
    const periodTo = this.parseOptionalDate(dto.periodTo, 'periodTo');
    if (periodFrom && periodTo && periodFrom.getTime() > periodTo.getTime()) {
      throw new BadRequestException('periodFrom cannot be after periodTo');
    }

    const asOfDate =
      this.parseOptionalDate(dto.asOfDate, 'asOfDate') ??
      periodTo ??
      new Date();

    const lines = await this.buildLines({
      projectId: dto.projectId,
      periodFrom: dto.periodFrom ?? null,
      periodTo: dto.periodTo ?? null,
    });

    const reportNumber = await this.numberingService.nextCode(
      NumberEntityType.MATERIAL_CONSUMPTION_REPORT,
      {
        asOf: asOfDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.reportModel.create({
      reportNumber,
      projectId: new Types.ObjectId(dto.projectId),
      periodFrom,
      periodTo,
      asOfDate,
      lines,
      status: MaterialConsumptionReportStatus.Draft,
      requiresApproval: lines.some((l) => l.requiresApproval),
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicMaterialConsumptionReport(row),
      'Material consumption report generated as draft',
    );
  }

  async update(
    id: string,
    dto: UpdateMaterialConsumptionReportDto,
    actorId: string,
  ) {
    const row = await this.requireReport(id);
    if (row.status !== MaterialConsumptionReportStatus.Draft) {
      throw new BadRequestException(
        'Only draft material consumption reports can be updated',
      );
    }

    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() ?? null;
    }

    if (dto.explanations?.length) {
      const byId = new Map(
        row.lines.map((line) => [String(line._id), line] as const),
      );
      for (const item of dto.explanations) {
        const line = byId.get(item.lineId);
        if (!line) {
          throw new BadRequestException(`Unknown lineId ${item.lineId}`);
        }
        line.explanation = item.explanation.trim();
        line.explainedBy = new Types.ObjectId(actorId);
        line.explainedAt = new Date();
      }
      row.markModified('lines');
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionReport(row),
      'Material consumption report updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireReport(id);
    if (row.status !== MaterialConsumptionReportStatus.Draft) {
      throw new BadRequestException(
        'Only draft material consumption reports can be submitted',
      );
    }
    if (!row.lines?.length) {
      throw new BadRequestException('Report has no consumption lines');
    }

    for (const line of row.lines) {
      assertVarianceExplained({
        requiresApproval: line.requiresApproval,
        explanation: line.explanation,
      });
    }

    row.status = MaterialConsumptionReportStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionReport(row),
      'Material consumption report submitted',
    );
  }

  async approve(
    id: string,
    actorId: string,
    dto: ApproveMaterialConsumptionReportDto,
  ) {
    const row = await this.requireReport(id);
    if (row.status !== MaterialConsumptionReportStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted material consumption reports can be approved',
      );
    }

    await this.assertCanApprove(actorId);

    assertVarianceApprovalComment({
      requiresApproval: row.requiresApproval,
      approvalComment: dto.approvalComment,
    });

    for (const line of row.lines) {
      assertVarianceExplained({
        requiresApproval: line.requiresApproval,
        explanation: line.explanation,
      });
    }

    row.status = MaterialConsumptionReportStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.approvalComment = dto.approvalComment?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionReport(row),
      'Material consumption report approved',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireReport(id);
    if (
      row.status === MaterialConsumptionReportStatus.Approved ||
      row.status === MaterialConsumptionReportStatus.Cancelled
    ) {
      throw new BadRequestException(
        'Approved or cancelled reports cannot be cancelled',
      );
    }

    row.status = MaterialConsumptionReportStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicMaterialConsumptionReport(row),
      'Material consumption report cancelled',
    );
  }

  async list(query: ListMaterialConsumptionReportsQueryDto) {
    const filter: FilterQuery<MaterialConsumptionReport> = {};
    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.requiresApproval !== undefined) {
      const flag =
        String(query.requiresApproval).toLowerCase() === 'true' ||
        query.requiresApproval === true;
      filter.requiresApproval = flag;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort: Record<string, SortOrder> = { createdAt: -1 };

    const [rows, total] = await Promise.all([
      this.reportModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.reportModel.countDocuments(filter),
    ]);

    return createSuccessResponse(
      rows.map((row) => toPublicMaterialConsumptionReport(row)),
      'Material consumption reports listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string) {
    const row = await this.requireReport(id);
    return createSuccessResponse(
      toPublicMaterialConsumptionReport(row),
      'Material consumption report fetched',
    );
  }

  private async buildLines(input: {
    projectId: string;
    periodFrom?: string | null;
    periodTo?: string | null;
  }): Promise<BuiltLine[]> {
    const projectOid = new Types.ObjectId(input.projectId);
    const periodFrom = this.parseOptionalDate(input.periodFrom, 'periodFrom');
    const periodTo = this.endOfDay(
      this.parseOptionalDate(input.periodTo, 'periodTo'),
    );
    const threshold = this.configService.get(
      'materialConsumptionVarianceThresholdPercent',
      { infer: true },
    );

    const measurementFilter: FilterQuery<WorkMeasurement> = {
      projectId: projectOid,
      status: {
        $in: [
          WorkMeasurementStatus.Submitted,
          WorkMeasurementStatus.Verified,
        ],
      },
    };
    if (periodFrom || periodTo) {
      measurementFilter.measurementDate = {};
      if (periodFrom) measurementFilter.measurementDate.$gte = periodFrom;
      if (periodTo) measurementFilter.measurementDate.$lte = periodTo;
    }

    const issueFilter: FilterQuery<MaterialIssue> = {
      projectId: projectOid,
      status: MaterialIssueStatus.Confirmed,
    };
    if (periodFrom || periodTo) {
      issueFilter.issueDate = {};
      if (periodFrom) issueFilter.issueDate.$gte = periodFrom;
      if (periodTo) issueFilter.issueDate.$lte = periodTo;
    }

    const [measurements, issues, activeVersion] = await Promise.all([
      this.measurementModel.find(measurementFilter).lean().exec(),
      this.issueModel.find(issueFilter).lean().exec(),
      this.boqVersionModel
        .findOne({
          projectId: projectOid,
          status: BoqVersionStatus.Active,
        })
        .lean()
        .exec(),
    ]);

    const workByBoq = new Map<string, number>();
    for (const m of measurements) {
      const key = String(m.boqItemId);
      workByBoq.set(
        key,
        roundQty((workByBoq.get(key) ?? 0) + (m.currentQuantity ?? 0)),
      );
    }

    const actualByKey = new Map<
      string,
      { issued: number; returned: number; materialId: string; boqItemId: string }
    >();
    for (const issue of issues) {
      const boqItemId = String(issue.boqItemId);
      for (const item of issue.items ?? []) {
        const materialId = String(item.materialId);
        const key = lineKey(boqItemId, materialId);
        const prev = actualByKey.get(key) ?? {
          issued: 0,
          returned: 0,
          materialId,
          boqItemId,
        };
        prev.issued = roundQty(prev.issued + (item.baseUnitQuantity ?? 0));
        prev.returned = roundQty(
          prev.returned + (item.returnedBaseQuantity ?? 0),
        );
        actualByKey.set(key, prev);
      }
    }

    const boqIds = new Set<string>([
      ...workByBoq.keys(),
      ...[...actualByKey.values()].map((v) => v.boqItemId),
    ]);

    const boqItems =
      boqIds.size > 0
        ? await this.boqItemModel
            .find({
              _id: {
                $in: [...boqIds].map((id) => new Types.ObjectId(id)),
              },
            })
            .lean()
            .exec()
        : [];

    // Also load active-version BOQ items that have coefficients for BOQs with progress
    let activeBoqItems: typeof boqItems = [];
    if (activeVersion && workByBoq.size > 0) {
      activeBoqItems = await this.boqItemModel
        .find({
          projectId: projectOid,
          versionId: activeVersion._id,
          _id: {
            $in: [...workByBoq.keys()].map((id) => new Types.ObjectId(id)),
          },
        })
        .lean()
        .exec();
    }

    const boqById = new Map<string, (typeof boqItems)[number]>();
    for (const item of [...boqItems, ...activeBoqItems]) {
      boqById.set(String(item._id), item);
    }

    type Norm = {
      coefficient: number;
      wastagePercentage: number;
      source: MaterialConsumptionStandardSource;
      materialRequired: boolean;
    };

    const norms = new Map<string, Norm>();

    for (const boq of boqById.values()) {
      const boqItemId = String(boq._id);
      for (const coeff of boq.materialCoefficients ?? []) {
        if (!coeff.materialId) continue;
        const materialId = String(coeff.materialId);
        norms.set(lineKey(boqItemId, materialId), {
          coefficient: coeff.coefficient ?? 0,
          wastagePercentage: 0, // filled from material / MCS below
          source: MaterialConsumptionStandardSource.BoqCoefficient,
          materialRequired: (coeff.coefficient ?? 0) > 0,
        });
      }
    }

    const materialIds = new Set<string>();
    for (const key of norms.keys()) {
      materialIds.add(key.split('|')[1]!);
    }
    for (const actual of actualByKey.values()) {
      materialIds.add(actual.materialId);
      if (!norms.has(lineKey(actual.boqItemId, actual.materialId))) {
        norms.set(lineKey(actual.boqItemId, actual.materialId), {
          coefficient: 0,
          wastagePercentage: 0,
          source: MaterialConsumptionStandardSource.None,
          materialRequired: false,
        });
      }
    }

    // Ensure progress BOQs with coefficients appear even if no issues yet
    for (const [boqItemId, qty] of workByBoq) {
      if (qty <= 0) continue;
      const boq = boqById.get(boqItemId);
      for (const coeff of boq?.materialCoefficients ?? []) {
        if (!coeff.materialId) continue;
        materialIds.add(String(coeff.materialId));
      }
    }

    const materials =
      materialIds.size > 0
        ? await this.materialModel
            .find({
              _id: {
                $in: [...materialIds].map((id) => new Types.ObjectId(id)),
              },
            })
            .lean()
            .exec()
        : [];
    const materialById = new Map(
      materials.map((m) => [String(m._id), m] as const),
    );

    const standards =
      materialIds.size > 0
        ? await this.standardModel
            .find({
              status: MaterialConsumptionStandardStatus.Active,
              materialId: {
                $in: [...materialIds].map((id) => new Types.ObjectId(id)),
              },
              $or: [{ projectId: projectOid }, { projectId: null }],
            })
            .lean()
            .exec()
        : [];

    for (const [key, norm] of norms) {
      const [boqItemId, materialId] = key.split('|') as [string, string];
      const material = materialById.get(materialId);
      let wastage = material?.standardWastagePercentage ?? 0;
      let coefficient = norm.coefficient;
      let source = norm.source;

      const projectStd = standards.find(
        (s) =>
          String(s.materialId) === materialId &&
          s.projectId &&
          String(s.projectId) === input.projectId &&
          s.boqItemId &&
          String(s.boqItemId) === boqItemId,
      );
      const globalStd = standards.find(
        (s) =>
          String(s.materialId) === materialId &&
          !s.projectId &&
          s.boqItemId &&
          String(s.boqItemId) === boqItemId,
      );
      const std = projectStd ?? globalStd;
      if (std) {
        coefficient = std.quantityPerUnit;
        wastage = std.wastagePercentage;
        source = MaterialConsumptionStandardSource.ConsumptionStandard;
        norm.materialRequired = coefficient > 0;
      } else if (source === MaterialConsumptionStandardSource.BoqCoefficient) {
        wastage = material?.standardWastagePercentage ?? 0;
      }

      norms.set(key, {
        coefficient,
        wastagePercentage: wastage,
        source,
        materialRequired: norm.materialRequired || coefficient > 0,
      });
    }

    const unexplainedByMaterial = await this.loadUnexplainedShortages(
      projectOid,
      [...materialIds],
    );

    const allKeys = new Set<string>([...norms.keys(), ...actualByKey.keys()]);
    const lines: BuiltLine[] = [];

    for (const key of allKeys) {
      const [boqItemId, materialId] = key.split('|') as [string, string];
      const workQuantityCompleted = workByBoq.get(boqItemId) ?? 0;
      const actual = actualByKey.get(key);
      const issued = actual?.issued ?? 0;
      const returned = actual?.returned ?? 0;
      const norm = norms.get(key) ?? {
        coefficient: 0,
        wastagePercentage: 0,
        source: MaterialConsumptionStandardSource.None,
        materialRequired: false,
      };
      const material = materialById.get(materialId);
      const boq = boqById.get(boqItemId);

      // Skip empty noise: no work, no issues, no required material
      if (
        workQuantityCompleted < 1e-9 &&
        issued < 1e-9 &&
        !norm.materialRequired
      ) {
        continue;
      }

      const metrics = computeConsumptionMetrics({
        workQuantityCompleted,
        coefficient: norm.coefficient,
        wastagePercentage: norm.wastagePercentage,
        actualMaterialIssued: issued,
        materialReturned: returned,
        standardRate: material?.standardRate ?? 0,
      });

      const alerts = evaluateConsumptionAlerts({
        metrics,
        materialRequired: norm.materialRequired,
        hasUnexplainedStockShortage: unexplainedByMaterial.has(materialId),
      });

      const requiresApproval = varianceRequiresApproval({
        metrics,
        alerts,
        thresholdPercent: threshold,
      });

      lines.push({
        boqItemId: new Types.ObjectId(boqItemId),
        boqCode: boq?.boqCode ?? null,
        materialId: new Types.ObjectId(materialId),
        materialCode: material?.materialCode ?? null,
        materialName: material?.name ?? null,
        baseUnit: material?.baseUnit ?? MaterialUnit.Number,
        workQuantityCompleted: metrics.workQuantityCompleted,
        coefficient: norm.coefficient,
        standardMaterialRequirement: metrics.standardMaterialRequirement,
        wastagePercentage: norm.wastagePercentage,
        allowedWastage: metrics.allowedWastage,
        expectedConsumption: metrics.expectedConsumption,
        actualMaterialIssued: metrics.actualMaterialIssued,
        materialReturned: metrics.materialReturned,
        netActualConsumption: metrics.netActualConsumption,
        varianceQuantity: metrics.varianceQuantity,
        variancePercentage: metrics.variancePercentage,
        varianceValue: metrics.varianceValue,
        standardRate: material?.standardRate ?? 0,
        standardSource: norm.source,
        alerts,
        requiresApproval,
        explanation: null,
        explainedBy: null,
        explainedAt: null,
      });
    }

    lines.sort((a, b) => {
      const codeCmp = (a.boqCode ?? '').localeCompare(b.boqCode ?? '');
      if (codeCmp !== 0) return codeCmp;
      return (a.materialCode ?? '').localeCompare(b.materialCode ?? '');
    });

    return lines;
  }

  private async loadUnexplainedShortages(
    projectId: Types.ObjectId,
    materialIds: string[],
  ): Promise<Set<string>> {
    const result = new Set<string>();
    if (materialIds.length === 0) return result;

    const counts = await this.stockCountModel
      .find({
        projectId,
        status: {
          $nin: [
            StockCountStatus.Cancelled,
            StockCountStatus.AdjustmentPosted,
          ],
        },
        'items.materialId': {
          $in: materialIds.map((id) => new Types.ObjectId(id)),
        },
      })
      .lean()
      .exec();

    for (const count of counts) {
      for (const item of count.items ?? []) {
        const materialId = String(item.materialId);
        if (!materialIds.includes(materialId)) continue;
        if (item.difference >= -1e-9) continue;
        if (!item.reason?.trim()) {
          result.add(materialId);
        }
      }
    }

    return result;
  }

  private async assertCanApprove(actorId: string) {
    const access = await this.permissionsService.resolveUserAccess(actorId);
    if (access.bypassPermissions) return;
    if (!access.permissions.includes('material_consumption.approve')) {
      throw new ForbiddenException(
        'material_consumption.approve permission is required',
      );
    }
  }

  private async requireReport(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid report id');
    }
    const row = await this.reportModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Material consumption report not found');
    }
    return row;
  }

  private parseOptionalDate(
    value: string | null | undefined,
    field: string,
  ): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private endOfDay(date: Date | null): Date | null {
    if (!date) return null;
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
}
