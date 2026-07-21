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
  IdempotencyService,
  LABOUR_ATTENDANCE_IDEMPOTENCY_SCOPE,
} from '../../database/services/idempotency.service';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import {
  LabourCategory,
  LabourCategoryStatus,
} from '../labour-categories/schemas/labour-category.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import { SiteAccessService } from '../sites/site-access.service';
import { SitesService } from '../sites/sites.service';
import type {
  ConfirmLabourAttendanceDto,
  CreateLabourAttendanceDto,
  DailyAttendanceReportQueryDto,
  ListLabourAttendanceQueryDto,
  UpdateLabourAttendanceDto,
} from './dto/labour-attendance.dto';
import {
  type AttendanceLike,
  type PublicDailyAttendanceReport,
  type PublicLabourAttendance,
  toPublicLabourAttendance,
  totalsFromLines,
} from './labour-attendance.mapper';
import {
  assertGps,
  assertReadyForSubmit,
  assertShift,
  attendanceDateKey,
  mergeDocumentIds,
  normalizeAttendanceDate,
  normalizeAttendanceLines,
} from './labour-attendance.validation';
import {
  LabourAttendance,
  LabourAttendanceDocument,
  LabourAttendanceShift,
  LabourAttendanceStatus,
} from './schemas/labour-attendance.schema';

const EDITABLE_STATUSES = [LabourAttendanceStatus.Draft];

@Injectable()
export class LabourAttendanceService {
  constructor(
    @InjectModel(LabourAttendance.name)
    private readonly attendanceModel: Model<LabourAttendance>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(LabourCategory.name)
    private readonly categoryModel: Model<LabourCategory>,
    private readonly numberingService: NumberingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly sitesService: SitesService,
    private readonly siteAccessService: SiteAccessService,
  ) {}

  async create(
    dto: CreateLabourAttendanceDto,
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
        scope: LABOUR_ATTENDANCE_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicLabourAttendance>;
      }
    }

    try {
      if (idempotencyKey) {
        const dup = await this.attendanceModel
          .findOne({ idempotencyKey: idempotencyKey.trim() })
          .lean()
          .exec();
        if (dup) {
          throw new ConflictException(
            'A labour attendance record with this idempotency key already exists',
          );
        }
      }

      await this.requireProject(dto.projectId);
      await this.requireContractor(dto.contractorId);
      const siteId = await this.resolveSiteForProject(
        dto.siteId,
        dto.projectId,
      );
      if (siteId) {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: actorId,
          projectId: dto.projectId,
          siteId: String(siteId),
        });
      }
      const dprId = this.resolveOptionalObjectId(dto.dprId, 'dprId');
      const attendanceDate = normalizeAttendanceDate(dto.attendanceDate);
      const shift = assertShift(dto.shift);
      await this.assertUniqueSheet(
        dto.projectId,
        dto.contractorId,
        attendanceDate,
        siteId,
        shift,
      );

      const groupPhotoDocumentIds = mergeDocumentIds({
        ids: dto.groupPhotoDocumentIds,
        attachments: dto.attachments,
        prefix: 'group_photo',
      });
      const lines = await this.buildLines(dto.lines);
      this.assertOptionalGps(dto.latitude, dto.longitude);

      const attendanceNumber = await this.numberingService.nextCode(
        NumberEntityType.LABOUR_ATTENDANCE,
        {
          asOf: attendanceDate,
          projectId: dto.projectId,
          projectScoped: true,
        },
      );

      const row = await this.attendanceModel.create({
        attendanceNumber,
        projectId: new Types.ObjectId(dto.projectId),
        siteId,
        contractorId: new Types.ObjectId(dto.contractorId),
        dprId,
        attendanceDate,
        shift,
        workLocation: dto.workLocation?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        lines,
        groupPhotoDocumentIds: groupPhotoDocumentIds.map(
          (id) => new Types.ObjectId(id),
        ),
        remarks: dto.remarks?.trim() || null,
        status: LabourAttendanceStatus.Draft,
        idempotencyKey: idempotencyKey?.trim() || null,
        clientDeviceId: dto.clientDeviceId?.trim() || null,
        offlineCapturedAt: dto.offlineCapturedAt
          ? new Date(dto.offlineCapturedAt)
          : null,
        createdBy: new Types.ObjectId(actorId),
      });

      let response = createSuccessResponse(
        toPublicLabourAttendance(row),
        'Labour attendance created as draft',
      );

      if (dto.submit) {
        response = await this.submit(String(row._id), actorId);
      }

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          LABOUR_ATTENDANCE_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          LABOUR_ATTENDANCE_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateLabourAttendanceDto,
    actorId: string,
  ) {
    const row = await this.requireAttendance(id);
    this.assertEditable(row);

    if (dto.attendanceDate != null) {
      throw new BadRequestException(
        'attendanceDate cannot be changed; create a new sheet for another day',
      );
    }
    if (dto.projectId != null && dto.projectId !== String(row.projectId)) {
      throw new BadRequestException('projectId cannot be changed');
    }
    if (
      dto.contractorId != null &&
      dto.contractorId !== String(row.contractorId)
    ) {
      throw new BadRequestException('contractorId cannot be changed');
    }

    const projectId = String(row.projectId);
    const previousSiteId = row.siteId;
    const previousShift = row.shift ?? LabourAttendanceShift.General;
    let nextSiteId = previousSiteId;
    let nextShift = previousShift;

    if (dto.siteId !== undefined) {
      nextSiteId = await this.resolveSiteForProject(dto.siteId, projectId);
      if (nextSiteId) {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: actorId,
          projectId,
          siteId: String(nextSiteId),
        });
      }
      row.siteId = nextSiteId;
    }
    if (dto.shift !== undefined) {
      nextShift = assertShift(dto.shift);
      row.shift = nextShift;
    }
    if (dto.dprId !== undefined) {
      row.dprId = this.resolveOptionalObjectId(dto.dprId, 'dprId');
    }

    const siteOrShiftChanged =
      String(nextSiteId ?? '') !== String(previousSiteId ?? '') ||
      nextShift !== previousShift;
    if (siteOrShiftChanged) {
      await this.assertUniqueSheet(
        projectId,
        String(row.contractorId),
        row.attendanceDate,
        nextSiteId,
        nextShift,
        String(row._id),
      );
    }

    if (dto.workLocation !== undefined) {
      row.workLocation = dto.workLocation?.trim() || null;
    }
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const latitude = dto.latitude !== undefined ? dto.latitude : row.latitude;
      const longitude =
        dto.longitude !== undefined ? dto.longitude : row.longitude;
      this.assertOptionalGps(latitude, longitude);
      if (dto.latitude !== undefined) row.latitude = dto.latitude ?? null;
      if (dto.longitude !== undefined) row.longitude = dto.longitude ?? null;
    }
    if (dto.remarks !== undefined) {
      row.remarks = dto.remarks?.trim() || null;
    }
    if (dto.lines != null) {
      row.lines = (await this.buildLines(dto.lines)) as LabourAttendance['lines'];
    }
    if (
      dto.groupPhotoDocumentIds !== undefined ||
      dto.attachments !== undefined
    ) {
      const merged = mergeDocumentIds({
        ids: dto.groupPhotoDocumentIds ?? row.groupPhotoDocumentIds.map(String),
        attachments: dto.attachments,
        prefix: 'group_photo',
      });
      row.groupPhotoDocumentIds = merged.map((id) => new Types.ObjectId(id));
    }
    if (dto.clientDeviceId !== undefined) {
      row.clientDeviceId = dto.clientDeviceId?.trim() || null;
    }
    if (dto.offlineCapturedAt !== undefined) {
      row.offlineCapturedAt = dto.offlineCapturedAt
        ? new Date(dto.offlineCapturedAt)
        : null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicLabourAttendance(row),
      'Labour attendance updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireAttendance(id);
    this.assertEditable(row);

    assertReadyForSubmit({
      lines: row.lines,
      latitude: row.latitude,
      longitude: row.longitude,
      groupPhotoDocumentIds: row.groupPhotoDocumentIds.map(String),
    });

    row.status = LabourAttendanceStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicLabourAttendance(row),
      'Labour attendance submitted',
    );
  }

  async confirm(
    id: string,
    dto: ConfirmLabourAttendanceDto,
    actorId: string,
  ) {
    const row = await this.requireAttendance(id);
    if (row.status !== LabourAttendanceStatus.Submitted) {
      throw new BadRequestException(
        'Only submitted attendance can be confirmed by a supervisor',
      );
    }

    row.status = LabourAttendanceStatus.Confirmed;
    row.supervisorConfirmed = true;
    row.confirmedBy = new Types.ObjectId(actorId);
    row.confirmedAt = new Date();
    row.confirmationNotes = dto.confirmationNotes?.trim() || null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicLabourAttendance(row),
      'Labour attendance confirmed by supervisor',
    );
  }

  async getById(id: string) {
    const row = await this.requireAttendance(id);
    return createSuccessResponse(
      toPublicLabourAttendance(row),
      'Labour attendance retrieved',
    );
  }

  async list(query: ListLabourAttendanceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<LabourAttendance> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.siteId) {
      filter.siteId = new Types.ObjectId(query.siteId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.dprId) {
      filter.dprId = new Types.ObjectId(query.dprId);
    }
    if (query.shift) {
      filter.shift = assertShift(query.shift);
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.attendanceDate) {
      filter.attendanceDate = normalizeAttendanceDate(query.attendanceDate);
    } else if (query.fromDate || query.toDate) {
      filter.attendanceDate = {};
      if (query.fromDate) {
        filter.attendanceDate.$gte = normalizeAttendanceDate(query.fromDate);
      }
      if (query.toDate) {
        filter.attendanceDate.$lte = normalizeAttendanceDate(query.toDate);
      }
    }

    const sortField = query.sortBy ?? 'attendanceDate';
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [rows, total] = await Promise.all([
      this.attendanceModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.attendanceModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      {
        items: rows.map((row) => toPublicLabourAttendance(row)),
        meta: buildPaginationMeta(page, limit, total),
      },
      'Labour attendance list',
    );
  }

  /**
   * Daily deployment rollup for DPR — filter by project + date (+ site/shift).
   */
  async dailyReport(
    query: DailyAttendanceReportQueryDto,
    actorId?: string,
  ) {
    await this.requireProject(query.projectId);
    const attendanceDate = normalizeAttendanceDate(query.attendanceDate);
    const shift = query.shift ? assertShift(query.shift) : null;

    if (query.siteId) {
      await this.resolveSiteForProject(query.siteId, query.projectId);
      if (actorId) {
        await this.siteAccessService.assertSiteAccessIfScoped({
          userId: actorId,
          projectId: query.projectId,
          siteId: query.siteId,
        });
      }
    }

    const filter: FilterQuery<LabourAttendance> = {
      projectId: new Types.ObjectId(query.projectId),
      attendanceDate,
    };
    if (query.siteId) {
      filter.siteId = new Types.ObjectId(query.siteId);
    }
    if (shift) {
      filter.shift = shift;
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }

    const rows = await this.attendanceModel
      .find(filter)
      .sort({ contractorId: 1, shift: 1 })
      .lean()
      .exec();

    const sheets = rows.map((row) => {
      const publicRow = toPublicLabourAttendance(row as AttendanceLike);
      return {
        id: publicRow.id,
        attendanceNumber: publicRow.attendanceNumber,
        siteId: publicRow.siteId,
        contractorId: publicRow.contractorId,
        dprId: publicRow.dprId,
        shift: publicRow.shift,
        status: publicRow.status,
        supervisorConfirmed: publicRow.supervisorConfirmed,
        workLocation: publicRow.workLocation,
        latitude: publicRow.latitude,
        longitude: publicRow.longitude,
        totalWorkers: publicRow.totalWorkers,
        totalOvertimeHours: publicRow.totalOvertimeHours,
        byCategory: publicRow.lines.map((line) => ({
          labourCategoryId: line.labourCategoryId,
          labourCategoryCode: line.labourCategoryCode,
          labourCategoryName: line.labourCategoryName,
          entryMode: line.entryMode,
          workerCount: line.workerCount,
          overtimeHours: line.overtimeHours,
        })),
      };
    });

    const totals = totalsFromLines(
      sheets.map((sheet) => ({
        workerCount: sheet.totalWorkers,
        overtimeHours: sheet.totalOvertimeHours,
      })),
    );
    const confirmedCount = sheets.filter(
      (sheet) => sheet.supervisorConfirmed,
    ).length;

    const report: PublicDailyAttendanceReport = {
      projectId: query.projectId,
      siteId: query.siteId ?? null,
      attendanceDate: attendanceDateKey(attendanceDate),
      shift,
      sheetCount: sheets.length,
      totalWorkers: totals.totalWorkers,
      totalOvertimeHours: totals.totalOvertimeHours,
      confirmedCount,
      pendingConfirmationCount: sheets.length - confirmedCount,
      sheets,
    };

    return createSuccessResponse(report, 'Daily labour attendance report');
  }

  /** Alias used by DPR labour deployment rollup. */
  async dailyDeployment(
    query: DailyAttendanceReportQueryDto,
    actorId?: string,
  ) {
    const response = await this.dailyReport(query, actorId);
    return createSuccessResponse(
      response.data!,
      'Daily labour deployment for DPR rollup',
    );
  }

  private async buildLines(dtoLines: CreateLabourAttendanceDto['lines']) {
    const normalized = normalizeAttendanceLines(dtoLines);
    const categoryIds = normalized.map((line) => line.labourCategoryId);
    const categories = await this.categoryModel
      .find({
        _id: { $in: categoryIds.map((id) => new Types.ObjectId(id)) },
        status: LabourCategoryStatus.Active,
      })
      .lean()
      .exec();
    const byId = new Map(categories.map((cat) => [String(cat._id), cat]));

    return normalized.map((line) => {
      const category = byId.get(line.labourCategoryId);
      if (!category) {
        throw new BadRequestException(
          `Labour category not found or inactive: ${line.labourCategoryId}`,
        );
      }
      return {
        labourCategoryId: new Types.ObjectId(line.labourCategoryId),
        labourCategoryCode: category.categoryCode,
        labourCategoryName: category.name,
        entryMode: line.entryMode,
        workerCount: line.workerCount,
        overtimeHours: line.overtimeHours,
        workers: line.workers,
        remarks: line.remarks,
      };
    });
  }

  private assertOptionalGps(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
  ) {
    if (latitude == null && longitude == null) return;
    if (latitude == null || longitude == null) {
      throw new BadRequestException(
        'Both latitude and longitude are required when providing GPS',
      );
    }
    assertGps(latitude, longitude);
  }

  private assertEditable(row: LabourAttendanceDocument) {
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        'Only draft attendance can be edited',
      );
    }
  }

  private async assertUniqueSheet(
    projectId: string,
    contractorId: string,
    attendanceDate: Date,
    siteId: Types.ObjectId | null,
    shift: LabourAttendanceShift,
    excludeId?: string,
  ) {
    const filter: FilterQuery<LabourAttendance> = {
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      attendanceDate,
      siteId: siteId ?? null,
      shift,
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.attendanceModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        `Attendance already exists for this contractor/site/shift on ${attendanceDateKey(attendanceDate)} (${existing.attendanceNumber})`,
      );
    }
  }

  private async resolveSiteForProject(
    siteId: string | null | undefined,
    projectId: string,
  ): Promise<Types.ObjectId | null> {
    if (siteId === undefined || siteId === null || siteId === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(siteId)) {
      throw new BadRequestException('Invalid siteId');
    }
    const site = await this.sitesService.findById(siteId);
    if (!site) {
      throw new BadRequestException('siteId site not found');
    }
    if (String(site.projectId) !== projectId) {
      throw new BadRequestException(
        'siteId does not belong to the attendance project',
      );
    }
    return site._id as Types.ObjectId;
  }

  private resolveOptionalObjectId(
    value: string | null | undefined,
    field: string,
  ): Types.ObjectId | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return new Types.ObjectId(value);
  }

  private async requireAttendance(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Labour attendance not found');
    }
    const row = await this.attendanceModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Labour attendance not found');
    }
    return row;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (
      project.status === ProjectStatus.Cancelled ||
      project.status === ProjectStatus.Completed ||
      project.status === ProjectStatus.Closed
    ) {
      throw new BadRequestException(
        `Project is ${project.status}; attendance cannot be recorded`,
      );
    }
    return String(project._id);
  }

  private async requireContractor(contractorId: string) {
    if (!Types.ObjectId.isValid(contractorId)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel
      .findById(contractorId)
      .lean()
      .exec();
    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }
    if (
      contractor.status === ContractorStatus.Blocked ||
      contractor.status === ContractorStatus.Inactive
    ) {
      throw new BadRequestException(
        `Contractor is ${contractor.status}; attendance cannot be recorded`,
      );
    }
    return String(contractor._id);
  }
}
