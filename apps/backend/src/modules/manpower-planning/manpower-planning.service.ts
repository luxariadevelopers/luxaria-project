import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  ContractorAgreement,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import {
  LabourAttendance,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  Project,
  ProjectStatus,
} from '../projects/schemas/project.schema';
import {
  BoqItem,
  BoqItemStatus,
} from '../boq/schemas/boq.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import type {
  CreateManpowerDailyPlanDto,
  EvaluateShortfallQueryDto,
  ListManpowerPlansQueryDto,
  ListShortfallAlertsQueryDto,
  ManpowerComparisonQueryDto,
  UpdateManpowerDailyPlanDto,
} from './dto/manpower-planning.dto';
import {
  type PublicManpowerComparison,
  toPublicManpowerDailyPlan,
  toPublicManpowerShortfallAlert,
} from './manpower-planning.mapper';
import {
  addUtcDays,
  buildSkillGaps,
  dateKey,
  evaluateWorkProgress,
  fillRatePercent,
  normalizePlanDate,
  normalizePlanSkillMix,
  resolveShortfallAlerts,
  shortfallPercent,
} from './manpower-planning.validation';
import {
  ManpowerDailyPlan,
  ManpowerPlanSource,
} from './schemas/manpower-plan.schema';
import { ManpowerShortfallAlert } from './schemas/manpower-shortfall-alert.schema';

const LOOKBACK_DAYS = 7;

@Injectable()
export class ManpowerPlanningService {
  constructor(
    @InjectModel(ManpowerDailyPlan.name)
    private readonly planModel: Model<ManpowerDailyPlan>,
    @InjectModel(ManpowerShortfallAlert.name)
    private readonly alertModel: Model<ManpowerShortfallAlert>,
    @InjectModel(ContractorAgreement.name)
    private readonly agreementModel: Model<ContractorAgreement>,
    @InjectModel(LabourAttendance.name)
    private readonly attendanceModel: Model<LabourAttendance>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(BoqItem.name)
    private readonly boqItemModel: Model<BoqItem>,
    @InjectModel(WorkMeasurement.name)
    private readonly measurementModel: Model<WorkMeasurement>,
    private readonly numberingService: NumberingService,
  ) {}

  async createPlan(dto: CreateManpowerDailyPlanDto, actorId: string) {
    await this.requireProject(dto.projectId);
    await this.requireContractor(dto.contractorId);
    const planDate = normalizePlanDate(dto.planDate);

    await this.assertUniquePlan(dto.projectId, dto.contractorId, planDate);

    const agreement = await this.resolveAgreement(
      dto.projectId,
      dto.contractorId,
      dto.agreementId,
      planDate,
    );

    let skillMix = normalizePlanSkillMix(dto.skillMix);
    let plannedHeadcount = dto.plannedHeadcount;
    let source = dto.source ?? ManpowerPlanSource.Manual;
    let agreementId = agreement?._id ?? null;

    if (
      (dto.useAgreementDefaults || (!dto.skillMix?.length && agreement)) &&
      agreement &&
      !dto.skillMix?.length
    ) {
      skillMix = normalizePlanSkillMix(
        (agreement.skillMix ?? []).map((entry) => ({
          skill: entry.skill,
          plannedHeadcount: entry.headcount,
          isCritical: entry.headcount > 0,
        })),
      );
      plannedHeadcount = agreement.manpowerCommitment;
      source = ManpowerPlanSource.AgreementDefault;
      agreementId = agreement._id;
    }

    if (plannedHeadcount == null) {
      plannedHeadcount = skillMix.reduce(
        (sum, line) => sum + line.plannedHeadcount,
        0,
      );
    }
    if (plannedHeadcount < 0) {
      throw new BadRequestException('plannedHeadcount must be ≥ 0');
    }

    const planNumber = await this.numberingService.nextCode(
      NumberEntityType.MANPOWER_DAILY_PLAN,
      {
        asOf: planDate,
        projectId: dto.projectId,
        projectScoped: true,
      },
    );

    const row = await this.planModel.create({
      planNumber,
      projectId: new Types.ObjectId(dto.projectId),
      contractorId: new Types.ObjectId(dto.contractorId),
      agreementId,
      planDate,
      plannedHeadcount,
      skillMix: skillMix.map((line) => ({
        labourCategoryId: line.labourCategoryId
          ? new Types.ObjectId(line.labourCategoryId)
          : null,
        skill: line.skill,
        plannedHeadcount: line.plannedHeadcount,
        isCritical: line.isCritical,
      })),
      source,
      notes: dto.notes?.trim() || null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicManpowerDailyPlan(row),
      'Manpower daily plan created',
    );
  }

  async updatePlan(
    id: string,
    dto: UpdateManpowerDailyPlanDto,
    actorId: string,
  ) {
    const row = await this.requirePlan(id);

    if (dto.projectId && dto.projectId !== String(row.projectId)) {
      throw new BadRequestException('projectId cannot be changed');
    }
    if (dto.contractorId && dto.contractorId !== String(row.contractorId)) {
      throw new BadRequestException('contractorId cannot be changed');
    }
    if (dto.planDate) {
      const planDate = normalizePlanDate(dto.planDate);
      if (planDate.getTime() !== row.planDate.getTime()) {
        await this.assertUniquePlan(
          String(row.projectId),
          String(row.contractorId),
          planDate,
          String(row._id),
        );
        row.planDate = planDate;
      }
    }
    if (dto.skillMix !== undefined) {
      const skillMix = normalizePlanSkillMix(dto.skillMix);
      row.skillMix = skillMix.map((line) => ({
        labourCategoryId: line.labourCategoryId
          ? new Types.ObjectId(line.labourCategoryId)
          : null,
        skill: line.skill,
        plannedHeadcount: line.plannedHeadcount,
        isCritical: line.isCritical,
      })) as ManpowerDailyPlan['skillMix'];
      row.markModified('skillMix');
      if (dto.plannedHeadcount === undefined) {
        row.plannedHeadcount = skillMix.reduce(
          (sum, line) => sum + line.plannedHeadcount,
          0,
        );
      }
    }
    if (dto.plannedHeadcount !== undefined) {
      row.plannedHeadcount = dto.plannedHeadcount;
    }
    if (dto.source !== undefined) row.source = dto.source;
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() || null;
    if (dto.agreementId !== undefined) {
      row.agreementId = dto.agreementId
        ? new Types.ObjectId(dto.agreementId)
        : null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicManpowerDailyPlan(row),
      'Manpower daily plan updated',
    );
  }

  async getPlanById(id: string) {
    const row = await this.requirePlan(id);
    return createSuccessResponse(
      toPublicManpowerDailyPlan(row),
      'Manpower daily plan retrieved',
    );
  }

  async listPlans(query: ListManpowerPlansQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ManpowerDailyPlan> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.planDate) {
      filter.planDate = normalizePlanDate(query.planDate);
    } else if (query.fromDate || query.toDate) {
      filter.planDate = {};
      if (query.fromDate) {
        filter.planDate.$gte = normalizePlanDate(query.fromDate);
      }
      if (query.toDate) {
        filter.planDate.$lte = normalizePlanDate(query.toDate);
      }
    }

    const sortField = query.sortBy ?? 'planDate';
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [rows, total] = await Promise.all([
      this.planModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.planModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((row) => toPublicManpowerDailyPlan(row)),
      'Manpower daily plans listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async compare(query: ManpowerComparisonQueryDto) {
    const asOfDate = normalizePlanDate(query.asOfDate);
    const comparison = await this.buildComparison(
      query.projectId,
      query.contractorId,
      asOfDate,
    );
    return createSuccessResponse(comparison, 'Manpower comparison');
  }

  async evaluateShortfallAlerts(query: EvaluateShortfallQueryDto = {}) {
    const asOf = query.asOf ? normalizePlanDate(query.asOf) : normalizePlanDate(new Date());

    const agreementFilter: FilterQuery<ContractorAgreement> = {
      status: ContractorAgreementStatus.Active,
      startDate: { $lte: asOf },
      endDate: { $gte: asOf },
    };
    if (query.projectId) {
      agreementFilter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      agreementFilter.contractorId = new Types.ObjectId(query.contractorId);
    }

    const agreements = await this.agreementModel
      .find(agreementFilter)
      .lean()
      .exec();

    let created = 0;
    let updated = 0;
    const alerts = [];

    for (const agreement of agreements) {
      const projectId = String(agreement.projectId);
      const contractorId = String(agreement.contractorId);
      const observations = await this.buildObservations(
        projectId,
        contractorId,
        asOf,
        LOOKBACK_DAYS,
      );
      const workProgress = await this.buildWorkProgress(
        projectId,
        contractorId,
        asOf,
      );
      const resolved = resolveShortfallAlerts({
        observations,
        workProgress,
      });

      for (const candidate of resolved) {
        const existing = await this.alertModel
          .findOne({
            projectId: new Types.ObjectId(projectId),
            contractorId: new Types.ObjectId(contractorId),
            asOfDate: asOf,
            alertType: candidate.alertType,
          })
          .exec();

        const payload = {
          agreementId: agreement._id,
          agreementNumber: agreement.agreementNumber,
          message: candidate.message,
          shortfallPercent: candidate.shortfallPercent,
          consecutiveDays: candidate.consecutiveDays,
          agreementHeadcount: candidate.agreementHeadcount,
          plannedHeadcount: candidate.plannedHeadcount,
          actualHeadcount: candidate.actualHeadcount,
          skillGaps: candidate.skillGaps,
          expectedScheduleImpactDays: candidate.expectedScheduleImpactDays,
          recommendedEscalation: candidate.recommendedEscalation,
        };

        if (existing) {
          Object.assign(existing, payload);
          existing.markModified('skillGaps');
          await existing.save();
          updated += 1;
          alerts.push(toPublicManpowerShortfallAlert(existing));
          continue;
        }

        const alert = await this.alertModel.create({
          projectId: new Types.ObjectId(projectId),
          contractorId: new Types.ObjectId(contractorId),
          asOfDate: asOf,
          alertType: candidate.alertType,
          acknowledged: false,
          ...payload,
        });
        created += 1;
        alerts.push(toPublicManpowerShortfallAlert(alert));
      }
    }

    return createSuccessResponse(
      { asOf, created, updated, alerts },
      `Manpower shortfall evaluation complete (${created} new alert(s))`,
    );
  }

  async listShortfallAlerts(query: ListShortfallAlertsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ManpowerShortfallAlert> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.alertType) filter.alertType = query.alertType;
    if (
      query.unacknowledgedOnly === true ||
      String(query.unacknowledgedOnly).toLowerCase() === 'true'
    ) {
      filter.acknowledged = false;
    }

    const [items, total] = await Promise.all([
      this.alertModel
        .find(filter)
        .sort({ asOfDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.alertModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicManpowerShortfallAlert(item)),
      'Manpower shortfall alerts listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  async acknowledgeShortfallAlert(id: string, actorId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid alert id');
    }
    const alert = await this.alertModel.findById(id).exec();
    if (!alert) {
      throw new NotFoundException('Manpower shortfall alert not found');
    }
    alert.acknowledged = true;
    alert.acknowledgedBy = new Types.ObjectId(actorId);
    alert.acknowledgedAt = new Date();
    await alert.save();

    return createSuccessResponse(
      toPublicManpowerShortfallAlert(alert),
      'Manpower shortfall alert acknowledged',
    );
  }

  private async buildComparison(
    projectId: string,
    contractorId: string,
    asOfDate: Date,
  ): Promise<PublicManpowerComparison> {
    await this.requireProject(projectId);
    await this.requireContractor(contractorId);

    const observations = await this.buildObservations(
      projectId,
      contractorId,
      asOfDate,
      1,
    );
    const latest = observations[0];
    const workProgress = await this.buildWorkProgress(
      projectId,
      contractorId,
      asOfDate,
    );
    const agreement = await this.resolveAgreement(
      projectId,
      contractorId,
      null,
      asOfDate,
    );
    const attendance = await this.attendanceModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        contractorId: new Types.ObjectId(contractorId),
        attendanceDate: asOfDate,
        status: {
          $in: [
            LabourAttendanceStatus.Submitted,
            LabourAttendanceStatus.Confirmed,
          ],
        },
      })
      .lean()
      .exec();

    const expected = Math.max(
      latest.plannedHeadcount,
      latest.agreementHeadcount,
    );

    return {
      projectId,
      contractorId,
      asOfDate: dateKey(asOfDate),
      agreementId: agreement ? String(agreement._id) : null,
      agreementNumber: agreement?.agreementNumber ?? null,
      agreementHeadcount: latest.agreementHeadcount,
      plannedHeadcount: latest.plannedHeadcount,
      actualHeadcount: latest.actualHeadcount,
      shortfallPercent: shortfallPercent(
        latest.actualHeadcount,
        expected || 1,
      ),
      fillRatePercent: fillRatePercent(
        latest.actualHeadcount,
        expected || 1,
      ),
      attendanceSubmitted: latest.attendanceSubmitted,
      attendanceStatus: attendance?.status ?? null,
      skillMix: latest.skillGaps.map((gap) => ({
        skill: gap.skill,
        committedHeadcount: gap.committedHeadcount,
        plannedHeadcount: gap.plannedHeadcount,
        actualHeadcount: gap.actualHeadcount,
        isCritical: gap.isCritical,
        missing:
          gap.isCritical &&
          (gap.plannedHeadcount > 0 || gap.committedHeadcount > 0) &&
          gap.actualHeadcount <= 0,
      })),
      workProgress,
    };
  }

  private async buildObservations(
    projectId: string,
    contractorId: string,
    asOf: Date,
    lookbackDays: number,
  ) {
    const observations = [];
    for (let offset = lookbackDays - 1; offset >= 0; offset -= 1) {
      const day = addUtcDays(asOf, -offset);
      observations.push(
        await this.buildDayObservation(projectId, contractorId, day),
      );
    }
    return observations;
  }

  private async buildDayObservation(
    projectId: string,
    contractorId: string,
    day: Date,
  ) {
    const agreement = await this.resolveAgreement(
      projectId,
      contractorId,
      null,
      day,
    );
    const plan = await this.planModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        contractorId: new Types.ObjectId(contractorId),
        planDate: day,
      })
      .lean()
      .exec();

    const attendance = await this.attendanceModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        contractorId: new Types.ObjectId(contractorId),
        attendanceDate: day,
        status: {
          $in: [
            LabourAttendanceStatus.Submitted,
            LabourAttendanceStatus.Confirmed,
          ],
        },
      })
      .lean()
      .exec();

    const agreementHeadcount = agreement?.manpowerCommitment ?? 0;
    const plannedHeadcount =
      plan?.plannedHeadcount ??
      agreementHeadcount;
    const actualHeadcount = (attendance?.lines ?? []).reduce(
      (sum, line) => sum + (line.workerCount || 0),
      0,
    );

    const committedSkills = (agreement?.skillMix ?? []).map((entry) => ({
      skill: entry.skill,
      headcount: entry.headcount,
    }));
    const plannedSkills =
      plan?.skillMix?.map((line) => ({
        skill: line.skill,
        plannedHeadcount: line.plannedHeadcount,
        isCritical: Boolean(line.isCritical),
      })) ??
      committedSkills.map((entry) => ({
        skill: entry.skill,
        plannedHeadcount: entry.headcount,
        isCritical: entry.headcount > 0,
      }));

    const actualBySkill = (attendance?.lines ?? []).map((line) => ({
      skill: line.labourCategoryName || line.labourCategoryCode || 'unknown',
      headcount: line.workerCount || 0,
    }));

    const skillGaps = buildSkillGaps({
      committed: committedSkills,
      planned: plannedSkills,
      actualBySkill,
    });

    return {
      date: day,
      agreementHeadcount,
      plannedHeadcount,
      actualHeadcount,
      attendanceSubmitted: Boolean(attendance),
      skillGaps,
    };
  }

  private async buildWorkProgress(
    projectId: string,
    contractorId: string,
    asOf: Date,
  ) {
    const items = await this.boqItemModel
      .find({
        projectId: new Types.ObjectId(projectId),
        status: BoqItemStatus.Active,
        startDate: { $ne: null },
        endDate: { $ne: null },
      })
      .lean()
      .exec();

    const progressItems = [];
    for (const item of items) {
      const latest = await this.measurementModel
        .findOne({
          projectId: new Types.ObjectId(projectId),
          contractorId: new Types.ObjectId(contractorId),
          boqItemId: item._id,
          status: {
            $in: [
              WorkMeasurementStatus.Submitted,
              WorkMeasurementStatus.Verified,
            ],
          },
          measurementDate: { $lte: asOf },
        })
        .sort({ measurementDate: -1, createdAt: -1 })
        .lean()
        .exec();

      progressItems.push({
        plannedQuantity: item.plannedQuantity,
        startDate: item.startDate,
        endDate: item.endDate,
        actualCumulative: latest?.cumulativeQuantity ?? 0,
      });
    }

    return evaluateWorkProgress({ items: progressItems, asOf });
  }

  private async resolveAgreement(
    projectId: string,
    contractorId: string,
    agreementId: string | null | undefined,
    asOf: Date,
  ) {
    if (agreementId) {
      if (!Types.ObjectId.isValid(agreementId)) {
        throw new BadRequestException('Invalid agreementId');
      }
      const row = await this.agreementModel.findById(agreementId).lean().exec();
      if (!row) throw new NotFoundException('Contractor agreement not found');
      return row;
    }

    return this.agreementModel
      .findOne({
        projectId: new Types.ObjectId(projectId),
        contractorId: new Types.ObjectId(contractorId),
        status: ContractorAgreementStatus.Active,
        startDate: { $lte: asOf },
        endDate: { $gte: asOf },
      })
      .sort({ version: -1 })
      .lean()
      .exec();
  }

  private async assertUniquePlan(
    projectId: string,
    contractorId: string,
    planDate: Date,
    excludeId?: string,
  ) {
    const filter: FilterQuery<ManpowerDailyPlan> = {
      projectId: new Types.ObjectId(projectId),
      contractorId: new Types.ObjectId(contractorId),
      planDate,
    };
    if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
    const existing = await this.planModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        `Manpower plan already exists for ${dateKey(planDate)} (${existing.planNumber})`,
      );
    }
  }

  private async requirePlan(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Manpower daily plan not found');
    }
    const row = await this.planModel.findById(id).exec();
    if (!row) throw new NotFoundException('Manpower daily plan not found');
    return row;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) throw new NotFoundException('Project not found');
    if (
      project.status === ProjectStatus.Cancelled ||
      project.status === ProjectStatus.Closed
    ) {
      throw new BadRequestException(
        `Project is ${project.status}; manpower planning is not allowed`,
      );
    }
    return project;
  }

  private async requireContractor(contractorId: string) {
    if (!Types.ObjectId.isValid(contractorId)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel
      .findById(contractorId)
      .lean()
      .exec();
    if (!contractor) throw new NotFoundException('Contractor not found');
    if (
      contractor.status === ContractorStatus.Blocked ||
      contractor.status === ContractorStatus.Inactive
    ) {
      throw new BadRequestException(
        `Contractor is ${contractor.status}; manpower planning is not allowed`,
      );
    }
    return contractor;
  }
}
