import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  DailyProgressReport,
  DprIssueSeverity,
  DprMissingAlert,
  DprStatus,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  LabourAttendance,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  MaterialStockTransaction,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import {
  aggregateSafe,
  collectionExists,
  countDocumentsSafe,
} from './optional-collection.helper';
import type {
  DirectorDashboardView,
  PmDashboardView,
  SeDashboardDateQuery,
} from './site-execution-dashboard.types';

/** DPR statuses treated as "completed" for completion % (submitted → locked). */
const DPR_COMPLETED_STATUSES = new Set<string>([
  DprStatus.Submitted,
  DprStatus.Verified,
  DprStatus.Reviewed,
  DprStatus.Approved,
  DprStatus.Locked,
]);

const OPEN_ISSUE_STATUSES = ['open', 'assigned'];

@Injectable()
export class SiteExecutionDashboardService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
    @InjectModel(DprMissingAlert.name)
    private readonly dprMissingModel: Model<DprMissingAlert>,
    @InjectModel(LabourAttendance.name)
    private readonly attendanceModel: Model<LabourAttendance>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly ledgerModel: Model<MaterialStockTransaction>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
  ) {}

  async getPmView(query: SeDashboardDateQuery) {
    const scope = this.resolveScope(query);
    const pid = scope.projectOid;

    const [
      dprCompletion,
      labour,
      equipmentUtilization,
      materialConsumed,
      delays,
      openIssues,
    ] = await Promise.all([
      this.dprCompletion(pid, scope),
      this.labour(pid, scope),
      this.equipmentUtilization(pid, scope),
      this.materialConsumed(pid, scope),
      this.delays(pid, scope),
      this.openIssues(pid),
    ]);

    const data: PmDashboardView = {
      projectId: scope.projectId,
      from: scope.from?.toISOString() ?? null,
      to: scope.to?.toISOString() ?? null,
      dprCompletion,
      labour,
      equipmentUtilization,
      materialConsumed,
      delays,
      openIssues,
    };

    return createSuccessResponse(data, 'Site execution PM dashboard');
  }

  async getDirectorView(query: SeDashboardDateQuery) {
    const scope = this.resolveScope(query);
    const pid = scope.projectOid;

    const [physicalProgress, dailyProductivity, criticalIssues] =
      await Promise.all([
        this.physicalProgress(pid),
        this.dailyProductivity(pid, scope),
        this.criticalIssues(pid, scope),
      ]);

    const data: DirectorDashboardView = {
      projectId: scope.projectId,
      from: scope.from?.toISOString() ?? null,
      to: scope.to?.toISOString() ?? null,
      physicalProgress,
      financialProgress: {
        percent: null,
        actualCost: null,
        budget: null,
        note: 'Financial progress placeholder — accounting / project cost wiring pending',
      },
      dailyProductivity,
      criticalIssues,
    };

    return createSuccessResponse(data, 'Site execution Director dashboard');
  }

  private async dprCompletion(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const match: FilterQuery<DailyProgressReport> = { projectId: projectOid };
    this.applyDate(match, 'reportDate', scope);

    const rows = await this.dprModel
      .aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .exec();

    const byStatus: Record<string, number> = {};
    let totalReports = 0;
    let completedReports = 0;
    for (const row of rows) {
      byStatus[row._id] = row.count;
      totalReports += row.count;
      if (DPR_COMPLETED_STATUSES.has(row._id)) {
        completedReports += row.count;
      }
    }

    const missingMatch: FilterQuery<DprMissingAlert> = {
      projectId: projectOid,
    };
    this.applyDate(missingMatch, 'reportDate', scope);
    const missingAlerts = await this.dprMissingModel
      .countDocuments(missingMatch)
      .exec();

    const denominator = totalReports + missingAlerts;
    const percent =
      denominator > 0
        ? this.round2((completedReports / denominator) * 100)
        : totalReports > 0
          ? this.round2((completedReports / totalReports) * 100)
          : 0;

    return {
      percent,
      totalReports,
      completedReports,
      missingAlerts,
      byStatus,
    };
  }

  private async labour(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const match: FilterQuery<LabourAttendance> = {
      projectId: projectOid,
      status: {
        $in: [
          LabourAttendanceStatus.Submitted,
          LabourAttendanceStatus.Confirmed,
        ],
      },
    };
    this.applyDate(match, 'attendanceDate', scope);

    const sheets = await this.attendanceModel
      .find(match)
      .select('lines')
      .lean()
      .exec();

    let headcount = 0;
    let overtimeHours = 0;
    for (const sheet of sheets) {
      for (const line of sheet.lines ?? []) {
        headcount += line.workerCount ?? 0;
        overtimeHours += line.overtimeHours ?? 0;
      }
    }

    const dprMatch: FilterQuery<DailyProgressReport> = {
      projectId: projectOid,
    };
    this.applyDate(dprMatch, 'reportDate', scope);
    const [dprLabour] = await this.dprModel
      .aggregate<{ skilled: number; unskilled: number }>([
        { $match: dprMatch },
        {
          $group: {
            _id: null,
            skilled: { $sum: '$skilledLabourCount' },
            unskilled: { $sum: '$unskilledLabourCount' },
          },
        },
      ])
      .exec();

    return {
      headcount,
      sheetCount: sheets.length,
      skilled: dprLabour?.skilled ?? 0,
      unskilled: dprLabour?.unskilled ?? 0,
      overtimeHours: this.round2(overtimeHours),
    };
  }

  private async equipmentUtilization(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const candidates = [
      'equipment_utilizations',
      'equipment_utilization',
      'equipment_utilization_lines',
    ];
    let available = false;
    let hoursWorked = 0;
    let hoursIdle = 0;
    let lineCount = 0;

    for (const name of candidates) {
      if (!(await collectionExists(this.connection, name))) continue;
      available = true;
      const dateMatch: Record<string, unknown> = {};
      if (scope.from || scope.to) {
        dateMatch.date = {};
        if (scope.from) {
          (dateMatch.date as Record<string, Date>).$gte = scope.from;
        }
        if (scope.to) {
          (dateMatch.date as Record<string, Date>).$lte = scope.to;
        }
      }
      const rows = await aggregateSafe<{
        hoursWorked: number;
        hoursIdle: number;
        lineCount: number;
      }>(this.connection, name, [
        {
          $match: {
            projectId: projectOid,
            isDeleted: { $ne: true },
            ...dateMatch,
          },
        },
        {
          $group: {
            _id: null,
            hoursWorked: {
              $sum: { $ifNull: ['$hoursWorked', { $ifNull: ['$hours', 0] }] },
            },
            hoursIdle: { $sum: { $ifNull: ['$hoursIdle', 0] } },
            lineCount: { $sum: 1 },
          },
        },
      ]);
      hoursWorked = rows[0]?.hoursWorked ?? 0;
      hoursIdle = rows[0]?.hoursIdle ?? 0;
      lineCount = rows[0]?.lineCount ?? 0;
      break;
    }

    const total = hoursWorked + hoursIdle;
    return {
      available,
      hoursWorked: this.round2(hoursWorked),
      hoursIdle: this.round2(hoursIdle),
      utilizationPercent:
        available && total > 0
          ? this.round2((hoursWorked / total) * 100)
          : available
            ? 0
            : null,
      lineCount,
    };
  }

  private async materialConsumed(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const match: FilterQuery<MaterialStockTransaction> = {
      projectId: projectOid,
      transactionType: StockTransactionType.MaterialIssue,
    };
    this.applyDate(match, 'transactionDate', scope);

    const [agg] = await this.ledgerModel
      .aggregate<{ quantity: number; value: number; issueCount: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            quantity: { $sum: '$quantityOut' },
            value: { $sum: { $ifNull: ['$totalValue', 0] } },
            issueCount: { $sum: 1 },
          },
        },
      ])
      .exec();

    return {
      quantity: this.round2(agg?.quantity ?? 0),
      value: this.round2(agg?.value ?? 0),
      issueCount: agg?.issueCount ?? 0,
    };
  }

  private async delays(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const match: FilterQuery<DailyProgressReport> = { projectId: projectOid };
    this.applyDate(match, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(match)
      .select('delays')
      .lean()
      .exec();

    let eventCount = 0;
    let hoursLost = 0;
    for (const dpr of dprs) {
      for (const delay of dpr.delays ?? []) {
        eventCount += 1;
        hoursLost += delay.hoursLost ?? 0;
      }
    }

    return {
      eventCount,
      hoursLost: this.round2(hoursLost),
    };
  }

  private async openIssues(projectOid: Types.ObjectId) {
    const available = await collectionExists(this.connection, 'site_issues');
    if (!available) {
      return { available: false, count: 0, critical: 0 };
    }

    const count = await countDocumentsSafe(this.connection, 'site_issues', {
      projectId: projectOid,
      status: { $in: OPEN_ISSUE_STATUSES },
    });
    const critical = await countDocumentsSafe(this.connection, 'site_issues', {
      projectId: projectOid,
      status: { $in: OPEN_ISSUE_STATUSES },
      severity: { $in: ['critical', 'high', DprIssueSeverity.Critical, DprIssueSeverity.High] },
    });

    return { available: true, count, critical };
  }

  private async physicalProgress(projectOid: Types.ObjectId) {
    const [row] = await this.workMeasurementModel
      .aggregate<{ planned: number; measured: number }>([
        {
          $match: {
            projectId: projectOid,
            status: WorkMeasurementStatus.Verified,
          },
        },
        {
          $group: {
            _id: '$boqItemId',
            planned: { $max: '$boqPlannedQuantity' },
            measured: { $max: '$cumulativeQuantity' },
          },
        },
        {
          $group: {
            _id: null,
            planned: { $sum: '$planned' },
            measured: { $sum: '$measured' },
          },
        },
      ])
      .exec();

    const planned = row?.planned ?? 0;
    const measured = row?.measured ?? 0;
    const percent =
      planned > 0 ? this.round2((measured / planned) * 100) : 0;

    return {
      percent,
      measured: this.round2(measured),
      planned: this.round2(planned),
    };
  }

  private async dailyProductivity(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const match: FilterQuery<DailyProgressReport> = { projectId: projectOid };
    this.applyDate(match, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(match)
      .select('boqQuantities labourCount reportDate')
      .lean()
      .exec();

    let quantityCompleted = 0;
    let labourHeadcount = 0;
    const days = new Set<string>();
    for (const dpr of dprs) {
      days.add(new Date(dpr.reportDate).toISOString().slice(0, 10));
      labourHeadcount += dpr.labourCount ?? 0;
      for (const q of dpr.boqQuantities ?? []) {
        quantityCompleted += q.quantityCompleted ?? 0;
      }
    }

    return {
      quantityCompleted: this.round2(quantityCompleted),
      labourHeadcount,
      qtyPerWorker:
        labourHeadcount > 0
          ? this.round2(quantityCompleted / labourHeadcount)
          : null,
      reportDays: days.size,
    };
  }

  private async criticalIssues(
    projectOid: Types.ObjectId,
    scope: { from: Date | null; to: Date | null },
  ) {
    const available = await collectionExists(this.connection, 'site_issues');
    let openIssuesCritical = 0;
    if (available) {
      openIssuesCritical = await countDocumentsSafe(
        this.connection,
        'site_issues',
        {
          projectId: projectOid,
          status: { $in: OPEN_ISSUE_STATUSES },
          severity: {
            $in: ['critical', DprIssueSeverity.Critical],
          },
        },
      );
    }

    const dprMatch: FilterQuery<DailyProgressReport> = {
      projectId: projectOid,
    };
    this.applyDate(dprMatch, 'reportDate', scope);
    const dprs = await this.dprModel
      .find(dprMatch)
      .select('safetyIssues qualityIssues')
      .lean()
      .exec();

    let dprCriticalSafety = 0;
    let dprCriticalQuality = 0;
    for (const dpr of dprs) {
      for (const issue of dpr.safetyIssues ?? []) {
        if (issue.severity === DprIssueSeverity.Critical) dprCriticalSafety += 1;
      }
      for (const issue of dpr.qualityIssues ?? []) {
        if (issue.severity === DprIssueSeverity.Critical) {
          dprCriticalQuality += 1;
        }
      }
    }

    return {
      available,
      count: openIssuesCritical + dprCriticalSafety + dprCriticalQuality,
      openIssuesCritical,
      dprCriticalSafety,
      dprCriticalQuality,
    };
  }

  private resolveScope(query: SeDashboardDateQuery) {
    if (!Types.ObjectId.isValid(query.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    let from: Date | null = null;
    let to: Date | null = null;
    if (query.from) {
      from = this.startOfUtcDay(new Date(query.from));
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
    }
    if (query.to) {
      to = this.endOfUtcDay(new Date(query.to));
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
    }
    if (from && to && from > to) {
      throw new BadRequestException('from must be on or before to');
    }

    // Default: last 30 days when no range provided
    if (!from && !to) {
      to = this.endOfUtcDay(new Date());
      from = this.startOfUtcDay(new Date());
      from.setUTCDate(from.getUTCDate() - 29);
    }

    return {
      projectId: query.projectId,
      projectOid: new Types.ObjectId(query.projectId),
      from,
      to,
    };
  }

  private applyDate(
    filter: Record<string, unknown>,
    field: string,
    scope: { from: Date | null; to: Date | null },
  ) {
    if (!scope.from && !scope.to) return;
    const range: Record<string, Date> = {};
    if (scope.from) range.$gte = scope.from;
    if (scope.to) range.$lte = scope.to;
    filter[field] = range;
  }

  private startOfUtcDay(d: Date) {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private endOfUtcDay(d: Date) {
    return new Date(
      Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }
}
