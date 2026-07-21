import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { BoqService } from '../boq/boq.service';
import {
  BoqItem,
  BoqItemStatus,
  BoqVersion,
  BoqVersionStatus,
  BoqVersionType,
} from '../boq/schemas/boq.schema';
import { DailyProgressReport } from '../daily-progress-reports/schemas/daily-progress-report.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import { Project } from '../projects/schemas/project.schema';
import { SiteAccessService } from '../sites/site-access.service';
import { SitesService } from '../sites/sites.service';
import {
  CertifyWorkMeasurementDto,
  CreateWorkMeasurementDto,
  ListWorkMeasurementsQueryDto,
  RejectWorkMeasurementDto,
  UpdateWorkMeasurementDto,
  VerifyWorkMeasurementDto,
} from './dto/work-measurement.dto';
import {
  toPublicWorkMeasurement,
  type PublicWorkMeasurement,
} from './work-measurement.mapper';
import {
  assertCumulativeWithinBoq,
  assertNonNegative,
  mergePhotoDocumentIds,
  normalizeMeasurementDate,
  roundQty,
} from './work-measurement.validation';
import {
  WorkMeasurement,
  WorkMeasurementDocument,
  WorkMeasurementStatus,
} from './schemas/work-measurement.schema';

const COUNTING_STATUSES: WorkMeasurementStatus[] = [
  WorkMeasurementStatus.Submitted,
  WorkMeasurementStatus.Verified,
  WorkMeasurementStatus.Certified,
];

@Injectable()
export class WorkMeasurementService {
  constructor(
    @InjectModel(WorkMeasurement.name)
    private readonly measurementModel: Model<WorkMeasurement>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(BoqItem.name)
    private readonly boqItemModel: Model<BoqItem>,
    @InjectModel(BoqVersion.name)
    private readonly boqVersionModel: Model<BoqVersion>,
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
    private readonly numberingService: NumberingService,
    private readonly projectScope: ProjectScopedDataHelper,
    private readonly siteAccessService: SiteAccessService,
    private readonly sitesService: SitesService,
    private readonly boqService: BoqService,
  ) {}

  async create(dto: CreateWorkMeasurementDto, actorId: string) {
    await this.projectScope.assertProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'work-measurement' },
    );
    await this.requireProject(dto.projectId);
    const siteId = await this.resolveSiteForProject(
      dto.siteId,
      dto.projectId,
      'siteId',
    );
    if (siteId) {
      await this.siteAccessService.assertSiteAccessIfScoped({
        userId: actorId,
        projectId: dto.projectId,
        siteId: String(siteId),
      });
    }
    const dprId = await this.resolveDprForProject(
      dto.dprId,
      dto.projectId,
      siteId,
    );
    const boq = await this.requireMeasurableBoqItem(
      dto.boqItemId,
      dto.projectId,
    );
    const measurementDate = normalizeMeasurementDate(dto.measurementDate);
    const currentQuantity = roundQty(dto.currentQuantity);
    assertNonNegative(currentQuantity, 'currentQuantity');

    const previousQuantity = await this.sumPriorQuantity({
      projectId: dto.projectId,
      boqItemId: dto.boqItemId,
      contractorId: dto.contractorId,
    });
    const cumulativeQuantity = roundQty(previousQuantity + currentQuantity);
    const hasApprovedVariationCap = await this.hasApprovedVariationCap(
      dto.projectId,
      boq.versionId,
    );
    assertCumulativeWithinBoq({
      cumulativeQuantity,
      boqPlannedQuantity: boq.plannedQuantity,
      hasApprovedVariationCap,
    });

    const photoIds = mergePhotoDocumentIds({
      ids: dto.photoDocumentIds,
      attachments: dto.attachments,
    });
    const measuredBy = dto.measuredBy ?? actorId;
    const drawingId = this.resolveOptionalObjectId(dto.drawingId, 'drawingId');

    const measurementNumber = await this.numberingService.nextCode(
      NumberEntityType.WORK_MEASUREMENT,
      {
        asOf: measurementDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.measurementModel.create({
      measurementNumber,
      projectId: new Types.ObjectId(dto.projectId),
      siteId,
      dprId,
      contractorId: new Types.ObjectId(dto.contractorId),
      boqItemId: new Types.ObjectId(dto.boqItemId),
      boqCode: boq.boqCode,
      location: dto.location.trim(),
      sheetReference: dto.sheetReference?.trim() || null,
      workDescription: dto.workDescription?.trim() || null,
      measurementDate,
      previousQuantity,
      currentQuantity,
      cumulativeQuantity,
      unit: boq.unit,
      measuredBy: new Types.ObjectId(measuredBy),
      photoDocumentIds: photoIds.map((id) => new Types.ObjectId(id)),
      drawingReference: dto.drawingReference?.trim() || null,
      drawingId,
      notes: dto.notes?.trim() || null,
      boqPlannedQuantity: boq.plannedQuantity,
      status: WorkMeasurementStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
      updatedBy: new Types.ObjectId(actorId),
    });

    await this.linkMeasurementToDpr(dprId, row._id as Types.ObjectId);

    if (dto.submit) {
      return this.submit(String(row._id), actorId);
    }

    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement created',
    );
  }

  async update(id: string, dto: UpdateWorkMeasurementDto, actorId: string) {
    const row = await this.requireMeasurement(id, actorId, 'update');
    if (
      row.status !== WorkMeasurementStatus.Draft &&
      row.status !== WorkMeasurementStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected measurements can be updated',
      );
    }

    const projectId = dto.projectId ?? String(row.projectId);
    const contractorId = dto.contractorId ?? String(row.contractorId);
    const boqItemId = dto.boqItemId ?? String(row.boqItemId);
    const previousDprId = row.dprId ? String(row.dprId) : null;

    if (dto.projectId) {
      await this.requireProject(dto.projectId);
    }

    let siteId = row.siteId;
    if (dto.siteId !== undefined) {
      siteId = await this.resolveSiteForProject(
        dto.siteId,
        projectId,
        'siteId',
      );
      if (siteId) {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: actorId,
          projectId,
          siteId: String(siteId),
        });
      }
    } else if (siteId) {
      await this.siteAccessService.assertSiteAccessIfScoped({
        userId: actorId,
        projectId,
        siteId: String(siteId),
      });
    }

    let dprId = row.dprId;
    if (dto.dprId !== undefined) {
      dprId = await this.resolveDprForProject(dto.dprId, projectId, siteId);
    }

    const boq = await this.requireMeasurableBoqItem(boqItemId, projectId);
    const measurementDate = dto.measurementDate
      ? normalizeMeasurementDate(dto.measurementDate)
      : row.measurementDate;
    const currentQuantity = roundQty(
      dto.currentQuantity ?? row.currentQuantity,
    );
    assertNonNegative(currentQuantity, 'currentQuantity');

    const previousQuantity = await this.sumPriorQuantity({
      projectId,
      boqItemId,
      contractorId,
      excludeId: String(row._id),
    });
    const cumulativeQuantity = roundQty(previousQuantity + currentQuantity);
    const hasApprovedVariationCap = await this.hasApprovedVariationCap(
      projectId,
      boq.versionId,
    );
    assertCumulativeWithinBoq({
      cumulativeQuantity,
      boqPlannedQuantity: boq.plannedQuantity,
      hasApprovedVariationCap,
    });

    row.projectId = new Types.ObjectId(projectId);
    row.siteId = siteId;
    row.dprId = dprId;
    row.contractorId = new Types.ObjectId(contractorId);
    row.boqItemId = new Types.ObjectId(boqItemId);
    row.boqCode = boq.boqCode;
    row.location = dto.location?.trim() ?? row.location;
    row.measurementDate = measurementDate;
    row.previousQuantity = previousQuantity;
    row.currentQuantity = currentQuantity;
    row.cumulativeQuantity = cumulativeQuantity;
    row.unit = boq.unit;
    row.boqPlannedQuantity = boq.plannedQuantity;

    if (dto.sheetReference !== undefined) {
      row.sheetReference = dto.sheetReference?.trim() || null;
    }
    if (dto.workDescription !== undefined) {
      row.workDescription = dto.workDescription?.trim() || null;
    }
    if (dto.measuredBy) {
      row.measuredBy = new Types.ObjectId(dto.measuredBy);
    }
    if (dto.drawingReference !== undefined) {
      row.drawingReference = dto.drawingReference?.trim() || null;
    }
    if (dto.drawingId !== undefined) {
      row.drawingId = this.resolveOptionalObjectId(dto.drawingId, 'drawingId');
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || null;
    }
    if (dto.photoDocumentIds !== undefined || dto.attachments !== undefined) {
      const photoIds = mergePhotoDocumentIds({
        ids: dto.photoDocumentIds ?? row.photoDocumentIds.map(String),
        attachments: dto.attachments,
      });
      row.photoDocumentIds = photoIds.map((pid) => new Types.ObjectId(pid));
    }

    if (row.status === WorkMeasurementStatus.Rejected) {
      row.status = WorkMeasurementStatus.Draft;
      row.rejectedBy = null;
      row.rejectedAt = null;
      row.rejectionReason = null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    const nextDprId = dprId ? String(dprId) : null;
    if (previousDprId !== nextDprId) {
      await this.unlinkMeasurementFromDpr(
        previousDprId,
        row._id as Types.ObjectId,
      );
      await this.linkMeasurementToDpr(dprId, row._id as Types.ObjectId);
    }

    if (dto.submit) {
      return this.submit(String(row._id), actorId);
    }

    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireMeasurement(id, actorId, 'update');
    if (
      row.status !== WorkMeasurementStatus.Draft &&
      row.status !== WorkMeasurementStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected measurements can be submitted',
      );
    }
    if (!row.measuredBy) {
      throw new BadRequestException('measuredBy is required before submit');
    }

    await this.revalidateQuantities(row);

    row.status = WorkMeasurementStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.rejectedBy = null;
    row.rejectedAt = null;
    row.rejectionReason = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement submitted for engineer verification',
    );
  }

  /**
   * Engineer verification — required before certify/approve.
   * Verifier cannot be the same user who measured.
   * Does not update BOQ progress (certify does).
   */
  async verify(
    id: string,
    dto: VerifyWorkMeasurementDto,
    actorId: string,
  ) {
    const row = await this.requireMeasurement(id, actorId, 'update');
    if (row.status !== WorkMeasurementStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted measurements can be verified',
      );
    }
    if (String(row.measuredBy) === actorId) {
      throw new ForbiddenException(
        'Engineer verification required: verifier cannot be the same user who measured',
      );
    }

    await this.revalidateQuantities(row);

    row.status = WorkMeasurementStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || row.notes;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement verified by engineer',
    );
  }

  /**
   * Certify / approve a verified measurement and sync BOQ progressQuantity.
   * Permission: `measurement.certify` (same as verify).
   */
  async certify(
    id: string,
    dto: CertifyWorkMeasurementDto,
    actorId: string,
  ) {
    const row = await this.requireMeasurement(id, actorId, 'approve');
    if (row.status !== WorkMeasurementStatus.Verified) {
      throw new BadRequestException(
        'Only verified measurements can be certified',
      );
    }
    if (String(row.measuredBy) === actorId) {
      throw new ForbiddenException(
        'Certifying engineer cannot be the same user who measured',
      );
    }

    await this.revalidateQuantities(row);

    row.status = WorkMeasurementStatus.Certified;
    row.certifiedBy = new Types.ObjectId(actorId);
    row.certifiedAt = new Date();
    if (!row.verifiedBy) {
      row.verifiedBy = new Types.ObjectId(actorId);
      row.verifiedAt = row.certifiedAt;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || row.notes;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    await this.syncBoqProgressQuantity(String(row.boqItemId), actorId);

    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement certified; BOQ progress updated',
    );
  }

  /** Alias for certify — architecture "approve" step. */
  async approve(
    id: string,
    dto: CertifyWorkMeasurementDto,
    actorId: string,
  ) {
    return this.certify(id, dto, actorId);
  }

  async reject(id: string, dto: RejectWorkMeasurementDto, actorId: string) {
    const row = await this.requireMeasurement(id, actorId, 'update');
    if (row.status !== WorkMeasurementStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted measurements can be rejected',
      );
    }
    if (String(row.measuredBy) === actorId) {
      throw new ForbiddenException(
        'Rejecting engineer cannot be the same user who measured',
      );
    }

    row.status = WorkMeasurementStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.verifiedBy = null;
    row.verifiedAt = null;
    row.certifiedBy = null;
    row.certifiedAt = null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement rejected',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requireMeasurement(id, actorId, 'update');
    if (
      row.status !== WorkMeasurementStatus.Draft &&
      row.status !== WorkMeasurementStatus.Rejected
    ) {
      throw new BadRequestException(
        'Only draft or rejected measurements can be cancelled',
      );
    }
    row.status = WorkMeasurementStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement cancelled',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireMeasurement(id, actorId, 'read');
    return createSuccessResponse(
      toPublicWorkMeasurement(row),
      'Work measurement retrieved',
    );
  }

  async list(query: ListWorkMeasurementsQueryDto, actorId: string) {
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'work-measurement' },
      );
    }
    let filter: Record<string, unknown> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) {
      filter.siteId = new Types.ObjectId(query.siteId);
    }
    if (query.dprId) {
      filter.dprId = new Types.ObjectId(query.dprId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.boqItemId) {
      filter.boqItemId = new Types.ObjectId(query.boqItemId);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.fromDate || query.toDate) {
      const range: Record<string, Date> = {};
      if (query.fromDate) {
        range.$gte = normalizeMeasurementDate(query.fromDate);
      }
      if (query.toDate) {
        range.$lte = normalizeMeasurementDate(query.toDate);
      }
      filter.measurementDate = range;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const [rows, total] = await Promise.all([
      this.measurementModel
        .find(filter)
        .sort({ measurementDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.measurementModel.countDocuments(filter).exec(),
    ]);

    const data: PublicWorkMeasurement[] = rows.map((row) =>
      toPublicWorkMeasurement(row),
    );

    return createSuccessResponse(data, 'Work measurements listed', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }

  /**
   * Recompute BOQ.progressQuantity as the max cumulativeQuantity among
   * certified measurements for the BOQ item (matches progress dashboards).
   */
  private async syncBoqProgressQuantity(boqItemId: string, actorId: string) {
    const [agg] = await this.measurementModel
      .aggregate<{ measured: number }>([
        {
          $match: {
            boqItemId: new Types.ObjectId(boqItemId),
            status: WorkMeasurementStatus.Certified,
          },
        },
        {
          $group: {
            _id: null,
            measured: { $max: '$cumulativeQuantity' },
          },
        },
      ])
      .exec();

    const progressQuantity = roundQty(agg?.measured ?? 0);
    await this.boqService.applyCertifiedProgressQuantity(
      boqItemId,
      progressQuantity,
      actorId,
    );
  }

  private async revalidateQuantities(row: WorkMeasurementDocument) {
    const boq = await this.requireMeasurableBoqItem(
      String(row.boqItemId),
      String(row.projectId),
    );
    const previousQuantity = await this.sumPriorQuantity({
      projectId: String(row.projectId),
      boqItemId: String(row.boqItemId),
      contractorId: String(row.contractorId),
      excludeId: String(row._id),
    });
    const cumulativeQuantity = roundQty(
      previousQuantity + row.currentQuantity,
    );
    const hasApprovedVariationCap = await this.hasApprovedVariationCap(
      String(row.projectId),
      boq.versionId,
    );
    assertCumulativeWithinBoq({
      cumulativeQuantity,
      boqPlannedQuantity: boq.plannedQuantity,
      hasApprovedVariationCap,
    });

    row.previousQuantity = previousQuantity;
    row.cumulativeQuantity = cumulativeQuantity;
    row.boqPlannedQuantity = boq.plannedQuantity;
    row.unit = boq.unit;
    row.boqCode = boq.boqCode;
  }

  private async sumPriorQuantity(input: {
    projectId: string;
    boqItemId: string;
    contractorId: string;
    excludeId?: string;
  }): Promise<number> {
    const match: Record<string, unknown> = {
      projectId: new Types.ObjectId(input.projectId),
      boqItemId: new Types.ObjectId(input.boqItemId),
      contractorId: new Types.ObjectId(input.contractorId),
      status: { $in: COUNTING_STATUSES },
    };
    if (input.excludeId) {
      match._id = { $ne: new Types.ObjectId(input.excludeId) };
    }

    const [agg] = await this.measurementModel
      .aggregate<{ total: number }>([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$currentQuantity' } } },
      ])
      .exec();

    return roundQty(agg?.total ?? 0);
  }

  /**
   * True when the BOQ item's active version is an approved variation
   * or change order (raises the measurable cap via approved BOQ qty).
   */
  private async hasApprovedVariationCap(
    projectId: string,
    versionId: Types.ObjectId,
  ): Promise<boolean> {
    const version = await this.boqVersionModel
      .findOne({
        _id: versionId,
        projectId: new Types.ObjectId(projectId),
        status: BoqVersionStatus.Active,
      })
      .lean()
      .exec();
    if (!version) {
      return false;
    }
    const isVariationType =
      version.versionType === BoqVersionType.Variation ||
      version.versionType === BoqVersionType.ChangeOrder;
    return (
      isVariationType &&
      Boolean(version.approvalReference) &&
      version.status === BoqVersionStatus.Active
    );
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async resolveSiteForProject(
    siteId: string | null | undefined,
    projectId: string,
    fieldName: string,
  ): Promise<Types.ObjectId | null> {
    if (siteId === undefined || siteId === null || siteId === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(siteId)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    const site = await this.sitesService.findById(siteId);
    if (!site) {
      throw new BadRequestException(`${fieldName} site not found`);
    }
    if (String(site.projectId) !== projectId) {
      throw new BadRequestException(
        `${fieldName} does not belong to the measurement project`,
      );
    }
    return site._id as Types.ObjectId;
  }

  private async resolveDprForProject(
    dprId: string | null | undefined,
    projectId: string,
    siteId: Types.ObjectId | null,
  ): Promise<Types.ObjectId | null> {
    if (dprId === undefined || dprId === null || dprId === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(dprId)) {
      throw new BadRequestException('Invalid dprId');
    }
    const dpr = await this.dprModel.findById(dprId).lean().exec();
    if (!dpr) {
      throw new NotFoundException('Daily progress report not found');
    }
    if (String(dpr.projectId) !== projectId) {
      throw new BadRequestException(
        'dprId does not belong to the measurement project',
      );
    }
    if (
      siteId &&
      dpr.siteId &&
      String(dpr.siteId) !== String(siteId)
    ) {
      throw new BadRequestException(
        'dprId site does not match measurement siteId',
      );
    }
    return dpr._id as Types.ObjectId;
  }

  private resolveOptionalObjectId(
    value: string | null | undefined,
    fieldName: string,
  ): Types.ObjectId | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return new Types.ObjectId(value);
  }

  private async linkMeasurementToDpr(
    dprId: Types.ObjectId | null,
    measurementId: Types.ObjectId,
  ) {
    if (!dprId) return;
    await this.dprModel
      .updateOne(
        { _id: dprId },
        { $addToSet: { workMeasurementIds: measurementId } },
      )
      .exec();
  }

  private async unlinkMeasurementFromDpr(
    dprId: string | null,
    measurementId: Types.ObjectId,
  ) {
    if (!dprId || !Types.ObjectId.isValid(dprId)) return;
    await this.dprModel
      .updateOne(
        { _id: new Types.ObjectId(dprId) },
        { $pull: { workMeasurementIds: measurementId } },
      )
      .exec();
  }

  private async requireMeasurableBoqItem(
    boqItemId: string,
    projectId: string,
  ) {
    if (!Types.ObjectId.isValid(boqItemId)) {
      throw new BadRequestException('Invalid boqItemId');
    }
    const item = await this.boqItemModel.findById(boqItemId).exec();
    if (!item || String(item.projectId) !== projectId) {
      throw new NotFoundException('BOQ item not found for project');
    }
    if (item.status === BoqItemStatus.Cancelled) {
      throw new BadRequestException('Cannot measure a cancelled BOQ item');
    }

    const version = await this.boqVersionModel.findById(item.versionId).exec();
    if (!version || version.status !== BoqVersionStatus.Active) {
      throw new BadRequestException(
        'BOQ item must belong to the active BOQ version',
      );
    }

    return item;
  }

  private async requireMeasurement(
    id: string,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ): Promise<WorkMeasurementDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid measurement id');
    }
    const row = await this.measurementModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Work measurement not found');
    }

    if (actorId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        String(row.projectId),
        action,
        { resourceType: 'work-measurement', resourceId: id },
      );
      if (row.siteId) {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: actorId,
          projectId: String(row.projectId),
          siteId: String(row.siteId),
        });
      }
    }
    return row;
  }
}
