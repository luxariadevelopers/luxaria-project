import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  DPR_IDEMPOTENCY_SCOPE,
  IdempotencyService,
} from '../../database/services/idempotency.service';
import { DocumentsService } from '../documents/documents.service';
import { MaterialIssuesService } from '../material-issues/material-issues.service';
import {
  MaterialIssue,
  MaterialIssueStatus,
  MaterialIssueTarget,
} from '../material-issues/schemas/material-issue.schema';
import {
  Material,
  MaterialStatus,
  MaterialUnit,
} from '../material-master/schemas/material.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import { BoqItem } from '../boq/schemas/boq.schema';
import { SiteAccessService } from '../sites/site-access.service';
import { Site, SiteStatus } from '../sites/schemas/site.schema';
import { StockReservationsService } from '../stock-reservations/stock-reservations.service';
import { StockReservationSourceType } from '../stock-reservations/schemas/stock-reservation.schema';
import { DprPdfService } from './dpr-pdf.service';
import {
  type PublicDailyProgressReport,
  toPublicDpr,
} from './dpr.mapper';
import {
  mergeDocumentIds,
  normalizeReportDate,
  reportDateKey,
  roundMoney,
  roundQty,
} from './dpr.validation';
import type {
  ApproveDailyProgressReportDto,
  CreateDailyProgressReportDto,
  DprBoqQuantityDto,
  DprDecisionRequiredDto,
  DprDelayDto,
  DprEquipmentUsedDto,
  DprIssueDto,
  DprMaterialLineDto,
  DprStaffPresentDto,
  ListDailyProgressReportsQueryDto,
  ReopenDailyProgressReportDto,
  ReviewDailyProgressReportDto,
  UpdateDailyProgressReportDto,
  VerifyDailyProgressReportDto,
} from './dto/dpr.dto';
import {
  DailyProgressReport,
  DailyProgressReportDocument,
  DprIssueSeverity,
  DprMissingAlert,
  DprShift,
  DprStatus,
  isApprovedLike,
} from './schemas/daily-progress-report.schema';

const EDITABLE_STATUSES = [DprStatus.Draft, DprStatus.Reopened];

@Injectable()
export class DprService {
  constructor(
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
    @InjectModel(DprMissingAlert.name)
    private readonly alertModel: Model<DprMissingAlert>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(BoqItem.name)
    private readonly boqItemModel: Model<BoqItem>,
    @InjectModel(Site.name)
    private readonly siteModel: Model<Site>,
    @InjectModel(MaterialIssue.name)
    private readonly materialIssueModel: Model<MaterialIssue>,
    @InjectModel(Material.name)
    private readonly materialModel: Model<Material>,
    private readonly numberingService: NumberingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly documentsService: DocumentsService,
    private readonly pdfService: DprPdfService,
    private readonly siteAccessService: SiteAccessService,
    private readonly materialIssuesService: MaterialIssuesService,
    private readonly stockReservationsService: StockReservationsService,
  ) {}

  async create(
    dto: CreateDailyProgressReportDto,
    actorId: string,
    idempotencyKey?: string | null,
  ) {
    const requestHash = this.idempotencyService.hashRequest({
      ...dto,
      actorId,
    });

    if (idempotencyKey) {
      const begin = await this.idempotencyService.begin({
        key: idempotencyKey,
        scope: DPR_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicDailyProgressReport>;
      }
    }

    try {
      if (idempotencyKey) {
        const dup = await this.dprModel
          .findOne({ idempotencyKey: idempotencyKey.trim() })
          .lean()
          .exec();
        if (dup) {
          throw new ConflictException(
            'A DPR with this idempotency key already exists',
          );
        }
      }

      await this.requireProject(dto.projectId);
      if (!dto.siteId?.trim()) {
        throw new BadRequestException('siteId is required for new DPRs');
      }
      await this.requireSiteInProject(dto.siteId, dto.projectId);
      await this.siteAccessService.assertSiteAccessIfScoped({
        userId: actorId,
        projectId: dto.projectId,
        siteId: dto.siteId,
      });

      const reportDate = normalizeReportDate(dto.reportDate);
      const shift = dto.shift ?? DprShift.General;
      await this.assertUniqueProjectSiteDateShift(
        dto.projectId,
        dto.siteId,
        reportDate,
        shift,
      );

      const photoDocumentIds = mergeDocumentIds({
        ids: dto.photoDocumentIds,
        attachments: dto.attachments,
        prefix: 'photo',
      });
      const videoDocumentIds = mergeDocumentIds({
        ids: dto.videoDocumentIds,
        attachments: dto.attachments,
        prefix: 'video',
      });
      const payload = await this.buildPayload({
        ...dto,
        photoDocumentIds,
        videoDocumentIds,
      });
      const dprNumber = await this.numberingService.nextCode(
        NumberEntityType.DAILY_PROGRESS_REPORT,
        {
          asOf: reportDate,
          projectId: dto.projectId,
          projectScoped: true,
        },
      );

      const row = await this.dprModel.create({
        dprNumber,
        projectId: new Types.ObjectId(dto.projectId),
        siteId: new Types.ObjectId(dto.siteId),
        reportDate,
        shift,
        ...payload,
        status: DprStatus.Draft,
        idempotencyKey: idempotencyKey?.trim() || null,
        clientDeviceId: dto.clientDeviceId?.trim() || null,
        offlineCapturedAt: dto.offlineCapturedAt
          ? new Date(dto.offlineCapturedAt)
          : null,
        createdBy: new Types.ObjectId(actorId),
      });

      let response = createSuccessResponse(
        toPublicDpr(row),
        'Daily progress report created as draft',
      );

      if (dto.submit) {
        response = await this.submit(String(row._id), actorId);
      }

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          DPR_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          DPR_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateDailyProgressReportDto,
    actorId: string,
  ) {
    const row = await this.requireDpr(id);
    this.assertEditable(row);
    await this.assertSiteAccessForRow(row, actorId);
    await this.applyPartialUpdate(row, dto, actorId);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicDpr(row), 'DPR updated');
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireDpr(id);
    this.assertEditable(row);
    await this.assertSiteAccessForRow(row, actorId);
    if (!row.workPerformed?.trim()) {
      throw new BadRequestException('workPerformed is required before submit');
    }
    if (!row.siteId) {
      throw new BadRequestException(
        'siteId is required before submit; set siteId on the DPR first',
      );
    }

    const pdfBuffer = await this.pdfService.buildPdfBuffer(row);
    const pdfDoc = await this.documentsService.createActiveFromBuffer(
      {
        projectId: String(row.projectId),
        module: 'site_operations',
        entityType: 'daily_progress_report',
        entityId: String(row._id),
        documentType: 'dpr_pdf',
        originalFileName: `${row.dprNumber}.pdf`,
        mimeType: 'application/pdf',
      },
      pdfBuffer,
      actorId,
    );

    row.pdfDocumentId = new Types.ObjectId(pdfDoc.data!.id);
    row.status = DprStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    await this.softReserveMaterialsOnSubmit(row, actorId);
    await this.clearMissingAlert(String(row.projectId), row.reportDate);

    return createSuccessResponse(
      toPublicDpr(row),
      'Daily progress report submitted',
    );
  }

  async verify(
    id: string,
    dto: VerifyDailyProgressReportDto,
    actorId: string,
  ) {
    const row = await this.requireDpr(id);
    await this.assertSiteAccessForRow(row, actorId);
    if (row.status !== DprStatus.Submitted) {
      throw new BadRequestException('Only submitted DPRs can be verified');
    }
    row.status = DprStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.verifyNotes = dto.verifyNotes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicDpr(row),
      'Daily progress report verified',
    );
  }

  /**
   * Legacy review endpoint — maps to approve behaviour (reviewed kept as alias).
   * Prefer `/approve` for new clients.
   */
  async review(
    id: string,
    dto: ReviewDailyProgressReportDto,
    actorId: string,
  ) {
    return this.approve(
      id,
      { approveNotes: dto.reviewNotes },
      actorId,
      { legacyReviewedAlias: true },
    );
  }

  async approve(
    id: string,
    dto: ApproveDailyProgressReportDto,
    actorId: string,
    options?: { legacyReviewedAlias?: boolean },
  ) {
    const row = await this.requireDpr(id);
    await this.assertSiteAccessForRow(row, actorId);

    const approvable =
      row.status === DprStatus.Submitted || row.status === DprStatus.Verified;
    if (!approvable) {
      throw new BadRequestException(
        'Only submitted or verified DPRs can be approved',
      );
    }

    await this.ensureMaterialIssuesForApprove(row, actorId);
    await this.confirmLinkedMaterialIssues(row, actorId);
    await this.consumeLinkedReservations(row, actorId);

    if (options?.legacyReviewedAlias) {
      row.status = DprStatus.Reviewed;
      row.reviewedBy = new Types.ObjectId(actorId);
      row.reviewedAt = new Date();
      row.reviewNotes = dto.approveNotes?.trim() || null;
    } else {
      row.status = DprStatus.Approved;
    }
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.approveNotes = dto.approveNotes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicDpr(row),
      options?.legacyReviewedAlias
        ? 'Daily progress report reviewed'
        : 'Daily progress report approved; material issues confirmed',
    );
  }

  async lock(id: string, actorId: string) {
    const row = await this.requireDpr(id);
    await this.assertSiteAccessForRow(row, actorId);
    if (!isApprovedLike(row.status) || row.status === DprStatus.Locked) {
      if (row.status === DprStatus.Locked) {
        throw new BadRequestException('DPR is already locked');
      }
      throw new BadRequestException(
        'Only approved or reviewed DPRs can be locked',
      );
    }
    row.status = DprStatus.Locked;
    row.lockedBy = new Types.ObjectId(actorId);
    row.lockedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicDpr(row),
      'Daily progress report locked',
    );
  }

  async reopen(
    id: string,
    dto: ReopenDailyProgressReportDto,
    actorId: string,
  ) {
    const row = await this.requireDpr(id);
    await this.assertSiteAccessForRow(row, actorId);

    if (dto.rejectToDraft && row.status === DprStatus.Submitted) {
      row.status = DprStatus.Draft;
      row.reopenedBy = new Types.ObjectId(actorId);
      row.reopenedAt = new Date();
      row.reopenReason = dto.reason.trim();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();
      return createSuccessResponse(
        toPublicDpr(row),
        'Daily progress report rejected to draft',
      );
    }

    const reopenable =
      row.status === DprStatus.Submitted ||
      row.status === DprStatus.Verified ||
      isApprovedLike(row.status);
    if (!reopenable) {
      throw new BadRequestException(
        'Only submitted, verified, approved, reviewed, or locked DPRs can be reopened',
      );
    }
    if (row.status === DprStatus.Locked) {
      // Controlled unlock path — reopen for amend; stock corrections via returns.
    }

    row.status = DprStatus.Reopened;
    row.reopenedBy = new Types.ObjectId(actorId);
    row.reopenedAt = new Date();
    row.reopenReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicDpr(row),
      'Daily progress report reopened for edits',
    );
  }

  async getById(id: string) {
    const row = await this.requireDpr(id);
    return createSuccessResponse(toPublicDpr(row), 'DPR fetched successfully');
  }

  async list(query: ListDailyProgressReportsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<DailyProgressReport> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) {
      filter.siteId = new Types.ObjectId(query.siteId);
    }
    if (query.shift) filter.shift = query.shift;
    if (query.status) filter.status = query.status;
    if (query.fromDate || query.toDate) {
      filter.reportDate = {};
      if (query.fromDate) {
        filter.reportDate.$gte = normalizeReportDate(query.fromDate);
      }
      if (query.toDate) {
        filter.reportDate.$lte = normalizeReportDate(query.toDate);
      }
    }

    const sort: Record<string, SortOrder> = { reportDate: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.dprModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.dprModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map(toPublicDpr),
      'DPRs fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async regeneratePdf(id: string, actorId: string) {
    const row = await this.requireDpr(id);
    await this.assertSiteAccessForRow(row, actorId);
    if (
      row.status !== DprStatus.Submitted &&
      row.status !== DprStatus.Verified &&
      !isApprovedLike(row.status)
    ) {
      throw new BadRequestException(
        'PDF can be regenerated only for submitted, verified, approved, reviewed, or locked DPRs',
      );
    }
    const pdfBuffer = await this.pdfService.buildPdfBuffer(row);
    const pdfDoc = await this.documentsService.createActiveFromBuffer(
      {
        projectId: String(row.projectId),
        module: 'site_operations',
        entityType: 'daily_progress_report',
        entityId: String(row._id),
        documentType: 'dpr_pdf',
        originalFileName: `${row.dprNumber}.pdf`,
        mimeType: 'application/pdf',
      },
      pdfBuffer,
      actorId,
    );
    row.pdfDocumentId = new Types.ObjectId(pdfDoc.data!.id);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicDpr(row), 'DPR PDF regenerated');
  }

  /** Cron / manual: raise alerts for projects missing a submitted DPR for a date. */
  async evaluateMissingAlerts(asOf?: Date) {
    const reportDate = normalizeReportDate(asOf ?? new Date());
    const projects = await this.projectModel
      .find({
        status: {
          $in: [
            ProjectStatus.Construction,
            ProjectStatus.PreConstruction,
          ],
        },
      })
      .select('_id projectCode projectName')
      .lean()
      .exec();

    let created = 0;
    let skipped = 0;
    const alerts = [];

    for (const project of projects) {
      const existingDpr = await this.dprModel
        .findOne({
          projectId: project._id,
          reportDate,
          status: {
            $in: [
              DprStatus.Submitted,
              DprStatus.Verified,
              DprStatus.Reviewed,
              DprStatus.Approved,
              DprStatus.Locked,
            ],
          },
        })
        .lean()
        .exec();
      if (existingDpr) {
        skipped += 1;
        continue;
      }

      const message = `Missing DPR for ${project.projectCode} on ${reportDateKey(reportDate)}`;
      const alert = await this.alertModel
        .findOneAndUpdate(
          { projectId: project._id, reportDate },
          {
            $setOnInsert: {
              projectId: project._id,
              reportDate,
              message,
              acknowledged: false,
              createdBy: null,
            },
          },
          { upsert: true, new: true },
        )
        .exec();
      if (alert) {
        created += 1;
        alerts.push({
          id: String(alert._id),
          projectId: String(project._id),
          reportDate,
          message: alert.message,
          acknowledged: alert.acknowledged,
        });
      }
    }

    return createSuccessResponse(
      { reportDate, created, skipped, alerts },
      `Missing-DPR evaluation complete (${created} alert(s))`,
    );
  }

  async listMissingAlerts(projectId?: string) {
    const filter: FilterQuery<DprMissingAlert> = { acknowledged: false };
    if (projectId) filter.projectId = new Types.ObjectId(projectId);
    const rows = await this.alertModel
      .find(filter)
      .sort({ reportDate: -1 })
      .limit(100)
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((r) => ({
        id: String(r._id),
        projectId: String(r.projectId),
        reportDate: r.reportDate,
        message: r.message,
        acknowledged: r.acknowledged,
      })),
      'Missing DPR alerts fetched',
    );
  }

  async acknowledgeAlert(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid alert id');
    }
    const row = await this.alertModel.findById(id).exec();
    if (!row) throw new NotFoundException('Missing-DPR alert not found');
    row.acknowledged = true;
    row.acknowledgedBy = new Types.ObjectId(actorId);
    row.acknowledgedAt = new Date();
    await row.save();
    return createSuccessResponse(
      {
        id: String(row._id),
        acknowledged: true,
      },
      'Alert acknowledged',
    );
  }

  // ── Material consumption (W2) ──────────────────────────────────────

  private async softReserveMaterialsOnSubmit(
    row: DailyProgressReportDocument,
    actorId: string,
  ) {
    const dprId = String(row._id);
    const projectId = String(row.projectId);
    const reservationIds = [...(row.stockReservationIds ?? [])];

    for (const line of row.materialsIssued ?? []) {
      if (!line.materialId || !(line.quantity > 0)) continue;
      const unit = this.resolveMaterialUnit(line.unit);
      if (!unit) continue;

      try {
        const created = await this.stockReservationsService.create(
          {
            projectId,
            materialId: String(line.materialId),
            quantity: line.quantity,
            unit,
            sourceType: StockReservationSourceType.Dpr,
            sourceId: dprId,
            notes: `Soft reserve from DPR ${row.dprNumber}`,
          },
          actorId,
        );
        if (created.data?.id) {
          reservationIds.push(new Types.ObjectId(created.data.id));
        }
      } catch {
        // Soft-reserve is best-effort; insufficient stock should not block submit.
      }
    }

    row.stockReservationIds = reservationIds;
    await row.save();
  }

  private async ensureMaterialIssuesForApprove(
    row: DailyProgressReportDocument,
    actorId: string,
  ) {
    const linkedIds = new Set(
      (row.materialIssueIds ?? []).map((id) => String(id)),
    );
    const dprId = String(row._id);
    const projectId = String(row.projectId);

    // Link any draft issues already tagged with this dprId.
    const tagged = await this.materialIssueModel
      .find({
        dprId: row._id,
        status: {
          $in: [MaterialIssueStatus.Draft, MaterialIssueStatus.Submitted],
        },
      })
      .select('_id')
      .lean()
      .exec();
    for (const issue of tagged) {
      linkedIds.add(String(issue._id));
    }

    // Create draft issues from materialsIssued lines that have materialId
    // and are not already covered by a linked issue.
    const linesWithMaterial = (row.materialsIssued ?? []).filter(
      (l) => l.materialId && l.quantity > 0,
    );
    if (linesWithMaterial.length && linkedIds.size === 0) {
      const itemsByUnit = new Map<
        string,
        Array<{ materialId: string; quantity: number; unit: MaterialUnit }>
      >();
      for (const line of linesWithMaterial) {
        const unit =
          this.resolveMaterialUnit(line.unit) ??
          (await this.lookupMaterialBaseUnit(String(line.materialId)));
        if (!unit) continue;
        const key = unit;
        const list = itemsByUnit.get(key) ?? [];
        list.push({
          materialId: String(line.materialId),
          quantity: line.quantity,
          unit,
        });
        itemsByUnit.set(key, list);
      }

      const allItems = [...itemsByUnit.values()].flat();
      if (allItems.length) {
        const created = await this.materialIssuesService.create(
          {
            projectId,
            issueDate: row.reportDate.toISOString(),
            receivedBy: actorId,
            issuedBy: actorId,
            issueTarget: MaterialIssueTarget.Site,
            issueSiteId: row.siteId ? String(row.siteId) : null,
            dprId,
            workLocation: `DPR ${row.dprNumber}`,
            notes: `Auto-created from DPR ${row.dprNumber} approve`,
            items: allItems,
          },
          actorId,
        );
        if (created.data?.id) {
          linkedIds.add(created.data.id);
        }
      }
    }

    row.materialIssueIds = [...linkedIds].map((id) => new Types.ObjectId(id));
    await row.save();
  }

  private async confirmLinkedMaterialIssues(
    row: DailyProgressReportDocument,
    actorId: string,
  ) {
    const dprId = String(row._id);
    for (const issueId of row.materialIssueIds ?? []) {
      const issue = await this.materialIssueModel.findById(issueId).exec();
      if (!issue) continue;
      if (issue.status === MaterialIssueStatus.Confirmed) continue;
      if (issue.status === MaterialIssueStatus.Cancelled) continue;

      if (!issue.dprId) {
        issue.dprId = row._id as Types.ObjectId;
        await issue.save();
      }

      await this.materialIssuesService.confirmForDpr(
        String(issue._id),
        dprId,
        actorId,
      );
    }
  }

  private async consumeLinkedReservations(
    row: DailyProgressReportDocument,
    actorId: string,
  ) {
    const dprId = String(row._id);
    const fromIds = (row.stockReservationIds ?? []).map(String);
    const fromSource = await this.stockReservationsService.listActiveBySource(
      StockReservationSourceType.Dpr,
      dprId,
    );
    const allIds = new Set([
      ...fromIds,
      ...fromSource.map((r) => String(r._id)),
    ]);

    for (const reservationId of allIds) {
      try {
        await this.stockReservationsService.markConsumed(
          reservationId,
          actorId,
        );
      } catch {
        // Already released/cancelled — ignore.
      }
    }
  }

  private resolveMaterialUnit(unit?: string | null): MaterialUnit | null {
    if (!unit?.trim()) return null;
    const normalized = unit.trim().toLowerCase().replace(/\s+/g, '_');
    const values = Object.values(MaterialUnit) as string[];
    if (values.includes(normalized)) {
      return normalized as MaterialUnit;
    }
    return null;
  }

  private async lookupMaterialBaseUnit(
    materialId: string,
  ): Promise<MaterialUnit | null> {
    if (!Types.ObjectId.isValid(materialId)) return null;
    const material = await this.materialModel.findById(materialId).lean().exec();
    if (!material || material.status !== MaterialStatus.Active) return null;
    return material.baseUnit;
  }

  // ── Internals ──────────────────────────────────────────────────────

  private async applyPartialUpdate(
    row: DailyProgressReportDocument,
    dto: UpdateDailyProgressReportDto,
    actorId: string,
  ) {
    if (dto.siteId !== undefined) {
      if (!dto.siteId) {
        throw new BadRequestException('siteId cannot be cleared');
      }
      await this.requireSiteInProject(dto.siteId, String(row.projectId));
      await this.siteAccessService.assertSiteAccessIfScoped({
        userId: actorId,
        projectId: String(row.projectId),
        siteId: dto.siteId,
      });
      const nextShift = dto.shift ?? row.shift ?? DprShift.General;
      await this.assertUniqueProjectSiteDateShift(
        String(row.projectId),
        dto.siteId,
        row.reportDate,
        nextShift,
        String(row._id),
      );
      row.siteId = new Types.ObjectId(dto.siteId);
    }
    if (dto.zoneSiteId !== undefined) {
      row.zoneSiteId = dto.zoneSiteId
        ? new Types.ObjectId(dto.zoneSiteId)
        : null;
    }
    if (dto.blockSiteId !== undefined) {
      row.blockSiteId = dto.blockSiteId
        ? new Types.ObjectId(dto.blockSiteId)
        : null;
    }
    if (dto.towerSiteId !== undefined) {
      row.towerSiteId = dto.towerSiteId
        ? new Types.ObjectId(dto.towerSiteId)
        : null;
    }
    if (dto.floorSiteId !== undefined) {
      row.floorSiteId = dto.floorSiteId
        ? new Types.ObjectId(dto.floorSiteId)
        : null;
    }
    if (dto.unitId !== undefined) {
      row.unitId = dto.unitId ? new Types.ObjectId(dto.unitId) : null;
    }
    if (dto.locationSiteIds !== undefined) {
      row.locationSiteIds = dto.locationSiteIds.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (dto.shift !== undefined) {
      if (row.siteId) {
        await this.assertUniqueProjectSiteDateShift(
          String(row.projectId),
          String(row.siteId),
          row.reportDate,
          dto.shift,
          String(row._id),
        );
      }
      row.shift = dto.shift;
    }
    if (dto.weather !== undefined) row.weather = dto.weather;
    if (dto.weatherNotes !== undefined) {
      row.weatherNotes = dto.weatherNotes?.trim() || null;
    }
    if (dto.staffPresent !== undefined) {
      row.staffPresent = this.mapStaff(dto.staffPresent);
    }
    if (dto.labourCount !== undefined) row.labourCount = dto.labourCount;
    if (dto.skilledLabourCount !== undefined) {
      row.skilledLabourCount = dto.skilledLabourCount;
    }
    if (dto.unskilledLabourCount !== undefined) {
      row.unskilledLabourCount = dto.unskilledLabourCount;
    }
    if (dto.workPerformed !== undefined) {
      row.workPerformed = dto.workPerformed?.trim() || null;
    }
    if (dto.plannedWork !== undefined) {
      row.plannedWork = dto.plannedWork?.trim() || null;
    }
    if (dto.delayedWork !== undefined) {
      row.delayedWork = dto.delayedWork?.trim() || null;
    }
    if (dto.boqQuantities !== undefined) {
      row.boqQuantities = await this.mapBoqQuantities(dto.boqQuantities);
    }
    if (dto.materialsReceived !== undefined) {
      row.materialsReceived = this.mapMaterials(dto.materialsReceived);
    }
    if (dto.materialsIssued !== undefined) {
      row.materialsIssued = this.mapMaterials(dto.materialsIssued);
    }
    if (dto.equipmentUsed !== undefined) {
      row.equipmentUsed = this.mapEquipment(dto.equipmentUsed);
    }
    if (dto.delays !== undefined) row.delays = this.mapDelays(dto.delays);
    if (dto.safetyIssues !== undefined) {
      row.safetyIssues = this.mapIssues(dto.safetyIssues);
    }
    if (dto.qualityIssues !== undefined) {
      row.qualityIssues = this.mapIssues(dto.qualityIssues);
    }
    if (dto.decisionsRequired !== undefined) {
      row.decisionsRequired = this.mapDecisions(dto.decisionsRequired);
    }
    if (dto.tomorrowPlan !== undefined) {
      row.tomorrowPlan = dto.tomorrowPlan?.trim() || null;
    }
    if (dto.photoDocumentIds !== undefined) {
      row.photoDocumentIds = dto.photoDocumentIds.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (dto.videoDocumentIds !== undefined) {
      row.videoDocumentIds = dto.videoDocumentIds.map(
        (id) => new Types.ObjectId(id),
      );
    }
    this.applyRefArrays(row, dto);
    if (dto.siteCashBalance !== undefined) {
      row.siteCashBalance = roundMoney(dto.siteCashBalance);
    }
    if (dto.siteCashAccountId !== undefined) {
      row.siteCashAccountId = dto.siteCashAccountId
        ? new Types.ObjectId(dto.siteCashAccountId)
        : null;
    }

    if (
      dto.labourCount === undefined &&
      (dto.skilledLabourCount !== undefined ||
        dto.unskilledLabourCount !== undefined)
    ) {
      row.labourCount =
        (row.skilledLabourCount ?? 0) + (row.unskilledLabourCount ?? 0);
    }
  }

  private applyRefArrays(
    row: DailyProgressReportDocument,
    dto: UpdateDailyProgressReportDto | CreateDailyProgressReportDto,
  ) {
    const map = (
      ids: string[] | undefined,
      setter: (oids: Types.ObjectId[]) => void,
    ) => {
      if (ids !== undefined) {
        setter(ids.map((id) => new Types.ObjectId(id)));
      }
    };
    map(dto.materialIssueIds, (v) => {
      row.materialIssueIds = v;
    });
    map(dto.stockReservationIds, (v) => {
      row.stockReservationIds = v;
    });
    map(dto.labourAttendanceIds, (v) => {
      row.labourAttendanceIds = v;
    });
    map(dto.workMeasurementIds, (v) => {
      row.workMeasurementIds = v;
    });
    map(dto.equipmentUtilizationIds, (v) => {
      row.equipmentUtilizationIds = v;
    });
    map(dto.diaryEntryIds, (v) => {
      row.diaryEntryIds = v;
    });
    map(dto.qualityObservationIds, (v) => {
      row.qualityObservationIds = v;
    });
    map(dto.safetyIncidentIds, (v) => {
      row.safetyIncidentIds = v;
    });
    map(dto.siteIssueIds, (v) => {
      row.siteIssueIds = v;
    });
    map(dto.drawingIds, (v) => {
      row.drawingIds = v;
    });
  }

  private async buildPayload(dto: CreateDailyProgressReportDto) {
    const skilled = dto.skilledLabourCount ?? 0;
    const unskilled = dto.unskilledLabourCount ?? 0;
    const labourCount =
      dto.labourCount ??
      (skilled + unskilled > 0 ? skilled + unskilled : dto.labourCount ?? 0);

    return {
      zoneSiteId: dto.zoneSiteId ? new Types.ObjectId(dto.zoneSiteId) : null,
      blockSiteId: dto.blockSiteId ? new Types.ObjectId(dto.blockSiteId) : null,
      towerSiteId: dto.towerSiteId ? new Types.ObjectId(dto.towerSiteId) : null,
      floorSiteId: dto.floorSiteId ? new Types.ObjectId(dto.floorSiteId) : null,
      unitId: dto.unitId ? new Types.ObjectId(dto.unitId) : null,
      locationSiteIds: (dto.locationSiteIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      weather: dto.weather,
      weatherNotes: dto.weatherNotes?.trim() || null,
      staffPresent: this.mapStaff(dto.staffPresent),
      labourCount,
      skilledLabourCount: skilled,
      unskilledLabourCount: unskilled,
      workPerformed: dto.workPerformed?.trim() || null,
      plannedWork: dto.plannedWork?.trim() || null,
      delayedWork: dto.delayedWork?.trim() || null,
      boqQuantities: await this.mapBoqQuantities(dto.boqQuantities),
      materialsReceived: this.mapMaterials(dto.materialsReceived),
      materialsIssued: this.mapMaterials(dto.materialsIssued),
      equipmentUsed: this.mapEquipment(dto.equipmentUsed),
      delays: this.mapDelays(dto.delays),
      safetyIssues: this.mapIssues(dto.safetyIssues),
      qualityIssues: this.mapIssues(dto.qualityIssues),
      decisionsRequired: this.mapDecisions(dto.decisionsRequired),
      tomorrowPlan: dto.tomorrowPlan?.trim() || null,
      photoDocumentIds: (dto.photoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      videoDocumentIds: (dto.videoDocumentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      materialIssueIds: (dto.materialIssueIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      stockReservationIds: (dto.stockReservationIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      labourAttendanceIds: (dto.labourAttendanceIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      workMeasurementIds: (dto.workMeasurementIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      equipmentUtilizationIds: (dto.equipmentUtilizationIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      diaryEntryIds: (dto.diaryEntryIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      qualityObservationIds: (dto.qualityObservationIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      safetyIncidentIds: (dto.safetyIncidentIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      siteIssueIds: (dto.siteIssueIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
      drawingIds: (dto.drawingIds ?? []).map((id) => new Types.ObjectId(id)),
      siteCashBalance: roundMoney(dto.siteCashBalance ?? 0),
      siteCashAccountId: dto.siteCashAccountId
        ? new Types.ObjectId(dto.siteCashAccountId)
        : null,
    };
  }

  private mapStaff(dtos?: DprStaffPresentDto[]) {
    return (dtos ?? []).map((s) => ({
      name: s.name.trim(),
      role: s.role?.trim() || null,
      present: s.present !== false,
    }));
  }

  private async mapBoqQuantities(dtos?: DprBoqQuantityDto[]) {
    const lines = [];
    for (const dto of dtos ?? []) {
      if (!Types.ObjectId.isValid(dto.boqItemId)) {
        throw new BadRequestException(`Invalid boqItemId: ${dto.boqItemId}`);
      }
      const item = await this.boqItemModel.findById(dto.boqItemId).lean().exec();
      lines.push({
        boqItemId: new Types.ObjectId(dto.boqItemId),
        boqCode: item?.boqCode ?? null,
        description: item?.description ?? null,
        unit: item?.unit ?? null,
        quantityCompleted: roundQty(dto.quantityCompleted),
        notes: dto.notes?.trim() || null,
      });
    }
    return lines;
  }

  private mapMaterials(dtos?: DprMaterialLineDto[]) {
    return (dtos ?? []).map((m) => ({
      materialId: m.materialId ? new Types.ObjectId(m.materialId) : null,
      materialName: m.materialName.trim(),
      quantity: roundQty(m.quantity),
      unit: m.unit?.trim() || null,
      reference: m.reference?.trim() || null,
    }));
  }

  private mapEquipment(dtos?: DprEquipmentUsedDto[]) {
    return (dtos ?? []).map((e) => ({
      name: e.name.trim(),
      hours: roundQty(e.hours),
      notes: e.notes?.trim() || null,
    }));
  }

  private mapDelays(dtos?: DprDelayDto[]) {
    return (dtos ?? []).map((d) => ({
      reason: d.reason.trim(),
      hoursLost: roundQty(d.hoursLost),
      notes: d.notes?.trim() || null,
    }));
  }

  private mapIssues(dtos?: DprIssueDto[]) {
    return (dtos ?? []).map((i) => ({
      description: i.description.trim(),
      severity: i.severity ?? DprIssueSeverity.Medium,
      actionTaken: i.actionTaken?.trim() || null,
    }));
  }

  private mapDecisions(dtos?: DprDecisionRequiredDto[]) {
    return (dtos ?? []).map((d) => ({
      description: d.description.trim(),
      owner: d.owner?.trim() || null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
    }));
  }

  private assertEditable(row: DailyProgressReportDocument) {
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        `DPR cannot be edited in status ${row.status}; reopen first`,
      );
    }
  }

  private async assertUniqueProjectSiteDateShift(
    projectId: string,
    siteId: string,
    reportDate: Date,
    shift: DprShift,
    excludeId?: string,
  ) {
    const filter: FilterQuery<DailyProgressReport> = {
      projectId: new Types.ObjectId(projectId),
      siteId: new Types.ObjectId(siteId),
      reportDate,
      shift,
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.dprModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        `A DPR already exists for this project/site on ${reportDateKey(reportDate)} (${shift}). Reopen it to make changes.`,
      );
    }
  }

  private async clearMissingAlert(projectId: string, reportDate: Date) {
    await this.alertModel
      .updateMany(
        {
          projectId: new Types.ObjectId(projectId),
          reportDate,
          acknowledged: false,
        },
        {
          $set: {
            acknowledged: true,
            acknowledgedAt: new Date(),
          },
        },
      )
      .exec();
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireSiteInProject(siteId: string, projectId: string) {
    if (!Types.ObjectId.isValid(siteId)) {
      throw new BadRequestException('Invalid siteId');
    }
    const site = await this.siteModel.findById(siteId).exec();
    if (!site) throw new NotFoundException('Site not found');
    if (String(site.projectId) !== projectId) {
      throw new BadRequestException('siteId does not belong to projectId');
    }
    if (site.status !== SiteStatus.Active) {
      throw new BadRequestException('Site is not active');
    }
    return site;
  }

  private async assertSiteAccessForRow(
    row: DailyProgressReportDocument,
    actorId: string,
  ) {
    if (!row.siteId) return;
    await this.siteAccessService.assertSiteAccessIfScoped({
      userId: actorId,
      projectId: String(row.projectId),
      siteId: String(row.siteId),
    });
  }

  private async requireDpr(id: string): Promise<DailyProgressReportDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid DPR id');
    }
    const row = await this.dprModel.findById(id).exec();
    if (!row) throw new NotFoundException('Daily progress report not found');
    return row;
  }
}
