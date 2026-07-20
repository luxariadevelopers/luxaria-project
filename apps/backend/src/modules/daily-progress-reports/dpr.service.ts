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
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import { BoqItem } from '../boq/schemas/boq.schema';
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
} from './dto/dpr.dto';
import {
  DailyProgressReport,
  DailyProgressReportDocument,
  DprIssueSeverity,
  DprMissingAlert,
  DprStatus,
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
    private readonly numberingService: NumberingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly documentsService: DocumentsService,
    private readonly pdfService: DprPdfService,
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
      const reportDate = normalizeReportDate(dto.reportDate);
      await this.assertUniqueProjectDate(dto.projectId, reportDate);

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
        reportDate,
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
    await this.applyPartialUpdate(row, dto);
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(toPublicDpr(row), 'DPR updated');
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireDpr(id);
    this.assertEditable(row);
    if (!row.workPerformed?.trim()) {
      throw new BadRequestException('workPerformed is required before submit');
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

    await this.clearMissingAlert(String(row.projectId), row.reportDate);

    return createSuccessResponse(
      toPublicDpr(row),
      'Daily progress report submitted',
    );
  }

  async review(
    id: string,
    dto: ReviewDailyProgressReportDto,
    actorId: string,
  ) {
    const row = await this.requireDpr(id);
    if (row.status !== DprStatus.Submitted) {
      throw new BadRequestException('Only submitted DPRs can be reviewed');
    }
    row.status = DprStatus.Reviewed;
    row.reviewedBy = new Types.ObjectId(actorId);
    row.reviewedAt = new Date();
    row.reviewNotes = dto.reviewNotes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicDpr(row),
      'Daily progress report reviewed',
    );
  }

  async reopen(
    id: string,
    dto: ReopenDailyProgressReportDto,
    actorId: string,
  ) {
    const row = await this.requireDpr(id);
    if (
      row.status !== DprStatus.Submitted &&
      row.status !== DprStatus.Reviewed
    ) {
      throw new BadRequestException(
        'Only submitted or reviewed DPRs can be reopened',
      );
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
    if (
      row.status !== DprStatus.Submitted &&
      row.status !== DprStatus.Reviewed
    ) {
      throw new BadRequestException(
        'PDF can be regenerated only for submitted or reviewed DPRs',
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
            $in: [DprStatus.Submitted, DprStatus.Reviewed],
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

  // ── Internals ──────────────────────────────────────────────────────

  private async applyPartialUpdate(
    row: DailyProgressReportDocument,
    dto: UpdateDailyProgressReportDto,
  ) {
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

  private async buildPayload(dto: CreateDailyProgressReportDto) {
    const skilled = dto.skilledLabourCount ?? 0;
    const unskilled = dto.unskilledLabourCount ?? 0;
    const labourCount =
      dto.labourCount ??
      (skilled + unskilled > 0 ? skilled + unskilled : dto.labourCount ?? 0);

    return {
      weather: dto.weather,
      weatherNotes: dto.weatherNotes?.trim() || null,
      staffPresent: this.mapStaff(dto.staffPresent),
      labourCount,
      skilledLabourCount: skilled,
      unskilledLabourCount: unskilled,
      workPerformed: dto.workPerformed?.trim() || null,
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

  private async assertUniqueProjectDate(projectId: string, reportDate: Date) {
    const existing = await this.dprModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        reportDate,
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `A DPR already exists for this project on ${reportDateKey(reportDate)}. Reopen it to make changes.`,
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

  private async requireDpr(id: string): Promise<DailyProgressReportDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid DPR id');
    }
    const row = await this.dprModel.findById(id).exec();
    if (!row) throw new NotFoundException('Daily progress report not found');
    return row;
  }
}
