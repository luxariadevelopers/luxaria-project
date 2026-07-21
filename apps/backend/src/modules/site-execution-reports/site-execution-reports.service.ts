import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  DailyProgressReport,
  DprIssueSeverity,
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
  collectionExists,
  findSafe,
} from '../site-execution-dashboard/optional-collection.helper';

export type SeReportQuery = {
  projectId: string;
  from?: string;
  to?: string;
  limit?: number;
};

type ReportScope = {
  projectId: string;
  projectOid: Types.ObjectId;
  from: Date | null;
  to: Date | null;
  limit: number;
};

@Injectable()
export class SiteExecutionReportsService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
    @InjectModel(LabourAttendance.name)
    private readonly attendanceModel: Model<LabourAttendance>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly ledgerModel: Model<MaterialStockTransaction>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
  ) {}

  async dprRegister(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<DailyProgressReport> = {
      projectId: scope.projectOid,
    };
    this.applyDate(match, 'reportDate', scope);

    const rows = await this.dprModel
      .find(match)
      .sort({ reportDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        rows: rows.map((d) => ({
          dprId: String(d._id),
          dprNumber: d.dprNumber,
          reportDate: new Date(d.reportDate).toISOString(),
          siteId: d.siteId ? String(d.siteId) : null,
          shift: (d as { shift?: string }).shift ?? null,
          status: d.status,
          labourCount: d.labourCount ?? 0,
          skilledLabourCount: d.skilledLabourCount ?? 0,
          unskilledLabourCount: d.unskilledLabourCount ?? 0,
          delayCount: d.delays?.length ?? 0,
          weather: d.weather ?? null,
        })),
      },
      'DPR register report',
    );
  }

  async labour(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<LabourAttendance> = {
      projectId: scope.projectOid,
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
      .sort({ attendanceDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        rows: sheets.map((s) => {
          let workerCount = 0;
          let overtimeHours = 0;
          for (const line of s.lines ?? []) {
            workerCount += line.workerCount ?? 0;
            overtimeHours += line.overtimeHours ?? 0;
          }
          return {
            attendanceId: String(s._id),
            attendanceNumber: s.attendanceNumber,
            attendanceDate: new Date(s.attendanceDate).toISOString(),
            contractorId: String(s.contractorId),
            workerCount,
            overtimeHours: this.round2(overtimeHours),
            status: s.status,
          };
        }),
      },
      'Labour report',
    );
  }

  async equipmentUtilization(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const available = await collectionExists(
      this.connection,
      'equipment_utilizations',
    );
    if (!available) {
      return createSuccessResponse(
        { projectId: scope.projectId, available: false, rows: [] },
        'Equipment utilization report (module not registered)',
      );
    }

    const filter: Record<string, unknown> = { projectId: scope.projectOid };
    this.applyDate(filter, 'date', scope);
    const rows = await findSafe(
      this.connection,
      'equipment_utilizations',
      filter,
      { sort: { date: -1 }, limit: scope.limit },
    );

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: true,
        rows: rows.map((r) => ({
          utilizationId: String(r._id),
          equipmentId: r.equipmentId ? String(r.equipmentId) : null,
          siteId: r.siteId ? String(r.siteId) : null,
          dprId: r.dprId ? String(r.dprId) : null,
          date: r.date ? new Date(r.date as Date).toISOString() : null,
          hoursWorked: Number(r.hoursWorked ?? 0),
          hoursIdle: Number(r.hoursIdle ?? 0),
          notes: (r.notes as string | null) ?? null,
        })),
      },
      'Equipment utilization report',
    );
  }

  async materialConsumption(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<MaterialStockTransaction> = {
      projectId: scope.projectOid,
      transactionType: {
        $in: [
          StockTransactionType.MaterialIssue,
          StockTransactionType.Consumption,
        ],
      },
      quantityOut: { $gt: 0 },
    };
    this.applyDate(match, 'transactionDate', scope);

    const rows = await this.ledgerModel
      .find(match)
      .sort({ transactionDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        rows: rows.map((r) => ({
          ledgerId: String(r._id),
          materialId: String(r.materialId),
          transactionDate: new Date(r.transactionDate).toISOString(),
          quantityOut: r.quantityOut ?? 0,
          value: r.totalValue ?? 0,
          location: r.location ?? null,
          transactionType: r.transactionType,
        })),
      },
      'Material consumption report',
    );
  }

  async dailyProgress(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<DailyProgressReport> = {
      projectId: scope.projectOid,
    };
    this.applyDate(match, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(match)
      .sort({ reportDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        rows: dprs.map((d) => {
          const boqQty = (d.boqQuantities ?? []).reduce(
            (s, q) => s + (q.quantityCompleted ?? 0),
            0,
          );
          const delayHours = (d.delays ?? []).reduce(
            (s, x) => s + (x.hoursLost ?? 0),
            0,
          );
          return {
            dprId: String(d._id),
            dprNumber: d.dprNumber,
            reportDate: new Date(d.reportDate).toISOString(),
            status: d.status,
            workPerformed: d.workPerformed ?? null,
            plannedWork: (d as { plannedWork?: string | null }).plannedWork ?? null,
            delayedWork: (d as { delayedWork?: string | null }).delayedWork ?? null,
            boqQuantityCompleted: this.round2(boqQty),
            labourCount: d.labourCount ?? 0,
            delayHours: this.round2(delayHours),
            weather: d.weather ?? null,
          };
        }),
      },
      'Daily progress report',
    );
  }

  async delay(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<DailyProgressReport> = {
      projectId: scope.projectOid,
    };
    this.applyDate(match, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(match)
      .select('dprNumber reportDate delays siteId')
      .sort({ reportDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    const rows: Array<Record<string, unknown>> = [];
    for (const d of dprs) {
      for (const delay of d.delays ?? []) {
        rows.push({
          dprId: String(d._id),
          dprNumber: d.dprNumber,
          reportDate: new Date(d.reportDate).toISOString(),
          siteId: d.siteId ? String(d.siteId) : null,
          reason: delay.reason,
          hoursLost: delay.hoursLost ?? 0,
          notes: delay.notes ?? null,
        });
      }
    }

    // Also include site_issues of type delay when available
    if (await collectionExists(this.connection, 'site_issues')) {
      const issueFilter: Record<string, unknown> = {
        projectId: scope.projectOid,
        type: 'delay',
      };
      this.applyDate(issueFilter, 'createdAt', scope);
      const issues = await findSafe(this.connection, 'site_issues', issueFilter, {
        sort: { createdAt: -1 },
        limit: scope.limit,
      });
      for (const issue of issues) {
        rows.push({
          issueId: String(issue._id),
          issueNumber: issue.issueNumber ?? null,
          reportDate: issue.createdAt
            ? new Date(issue.createdAt as Date).toISOString()
            : null,
          siteId: issue.siteId ? String(issue.siteId) : null,
          reason: issue.title ?? issue.description ?? null,
          hoursLost: null,
          notes: issue.description ?? null,
          status: issue.status ?? null,
          source: 'site_issues',
        });
      }
    }

    return createSuccessResponse(
      { projectId: scope.projectId, rows },
      'Delay report',
    );
  }

  async quality(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const available = await collectionExists(this.connection, 'site_quality');

    if (available) {
      const filter: Record<string, unknown> = { projectId: scope.projectOid };
      this.applyDate(filter, 'createdAt', scope);
      const rows = await findSafe(this.connection, 'site_quality', filter, {
        sort: { createdAt: -1 },
        limit: scope.limit,
      });
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: true,
          source: 'site_quality',
          rows: rows.map((r) => ({
            qualityId: String(r._id),
            title: r.title ?? null,
            status: r.status ?? null,
            siteId: r.siteId ? String(r.siteId) : null,
            dprId: r.dprId ? String(r.dprId) : null,
            ncrNumber: r.ncrNumber ?? null,
            createdAt: r.createdAt
              ? new Date(r.createdAt as Date).toISOString()
              : null,
          })),
        },
        'Quality report',
      );
    }

    // Fallback: DPR embedded quality issues
    const match: FilterQuery<DailyProgressReport> = {
      projectId: scope.projectOid,
    };
    this.applyDate(match, 'reportDate', scope);
    const dprs = await this.dprModel
      .find(match)
      .select('dprNumber reportDate qualityIssues')
      .sort({ reportDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    const rows: Array<Record<string, unknown>> = [];
    for (const d of dprs) {
      for (const issue of d.qualityIssues ?? []) {
        rows.push({
          dprId: String(d._id),
          dprNumber: d.dprNumber,
          reportDate: new Date(d.reportDate).toISOString(),
          description: issue.description,
          severity: issue.severity,
          actionTaken: issue.actionTaken ?? null,
          source: 'dpr_qualityIssues',
        });
      }
    }

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: false,
        source: 'dpr_qualityIssues',
        rows,
      },
      'Quality report',
    );
  }

  async safety(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const candidates = ['site_safety', 'site_safety_events', 'hse_events'];
    for (const name of candidates) {
      if (!(await collectionExists(this.connection, name))) continue;
      const filter: Record<string, unknown> = { projectId: scope.projectOid };
      this.applyDate(filter, 'createdAt', scope);
      const rows = await findSafe(this.connection, name, filter, {
        sort: { createdAt: -1 },
        limit: scope.limit,
      });
      return createSuccessResponse(
        {
          projectId: scope.projectId,
          available: true,
          source: name,
          rows: rows.map((r) => ({
            safetyId: String(r._id),
            type: r.type ?? r.eventType ?? null,
            title: r.title ?? r.description ?? null,
            severity: r.severity ?? null,
            status: r.status ?? null,
            siteId: r.siteId ? String(r.siteId) : null,
            dprId: r.dprId ? String(r.dprId) : null,
            createdAt: r.createdAt
              ? new Date(r.createdAt as Date).toISOString()
              : null,
          })),
        },
        'Safety report',
      );
    }

    const match: FilterQuery<DailyProgressReport> = {
      projectId: scope.projectOid,
    };
    this.applyDate(match, 'reportDate', scope);
    const dprs = await this.dprModel
      .find(match)
      .select('dprNumber reportDate safetyIssues')
      .sort({ reportDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    const rows: Array<Record<string, unknown>> = [];
    for (const d of dprs) {
      for (const issue of d.safetyIssues ?? []) {
        rows.push({
          dprId: String(d._id),
          dprNumber: d.dprNumber,
          reportDate: new Date(d.reportDate).toISOString(),
          description: issue.description,
          severity: issue.severity ?? DprIssueSeverity.Medium,
          actionTaken: issue.actionTaken ?? null,
          source: 'dpr_safetyIssues',
        });
      }
    }

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        available: false,
        source: 'dpr_safetyIssues',
        rows,
      },
      'Safety report',
    );
  }

  async productivity(query: SeReportQuery) {
    const scope = this.resolveScope(query);
    const match: FilterQuery<DailyProgressReport> = {
      projectId: scope.projectOid,
    };
    this.applyDate(match, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(match)
      .sort({ reportDate: -1 })
      .limit(scope.limit)
      .lean()
      .exec();

    const wmMatch: FilterQuery<WorkMeasurement> = {
      projectId: scope.projectOid,
      status: {
        $in: [
          WorkMeasurementStatus.Submitted,
          WorkMeasurementStatus.Verified,
        ],
      },
    };
    this.applyDate(wmMatch, 'measurementDate', scope);
    const measurements = await this.workMeasurementModel
      .find(wmMatch)
      .select('measurementDate currentQuantity cumulativeQuantity boqCode')
      .lean()
      .exec();

    const measuredByDay = new Map<string, number>();
    for (const m of measurements) {
      const day = new Date(m.measurementDate).toISOString().slice(0, 10);
      measuredByDay.set(
        day,
        (measuredByDay.get(day) ?? 0) + (m.currentQuantity ?? 0),
      );
    }

    return createSuccessResponse(
      {
        projectId: scope.projectId,
        rows: dprs.map((d) => {
          const day = new Date(d.reportDate).toISOString().slice(0, 10);
          const boqQty = (d.boqQuantities ?? []).reduce(
            (s, q) => s + (q.quantityCompleted ?? 0),
            0,
          );
          const labour = d.labourCount ?? 0;
          return {
            reportDate: new Date(d.reportDate).toISOString(),
            dprId: String(d._id),
            dprNumber: d.dprNumber,
            boqQuantityCompleted: this.round2(boqQty),
            measuredQuantity: this.round2(measuredByDay.get(day) ?? 0),
            labourCount: labour,
            qtyPerWorker:
              labour > 0 ? this.round2(boqQty / labour) : null,
            status: d.status,
          };
        }),
      },
      'Productivity report',
    );
  }

  private resolveScope(query: SeReportQuery): ReportScope {
    if (!Types.ObjectId.isValid(query.projectId)) {
      throw new BadRequestException('Invalid projectId');
    }
    let from: Date | null = null;
    let to: Date | null = null;
    if (query.from) {
      from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
    }
    if (query.to) {
      to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
    }
    if (from && to && from > to) {
      throw new BadRequestException('from must be on or before to');
    }
    return {
      projectId: query.projectId,
      projectOid: new Types.ObjectId(query.projectId),
      from,
      to,
      limit: Math.min(Math.max(query.limit ?? 200, 1), 1000),
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

  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }
}
