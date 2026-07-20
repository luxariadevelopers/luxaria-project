import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  BoqItem,
  BoqVersion,
  BoqVersionStatus,
} from '../boq/schemas/boq.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import { Contractor } from '../contractors/schemas/contractor.schema';
import {
  DailyProgressReport,
  DprMissingAlert,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  GoodsReceipt,
  GoodsReceiptStatus,
} from '../goods-receipts/schemas/goods-receipt.schema';
import {
  LabourAttendance,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import { ManpowerShortfallAlert } from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportStatus,
} from '../material-consumption/schemas/material-consumption-report.schema';
import {
  MaterialIssue,
  MaterialIssueStatus,
} from '../material-issues/schemas/material-issue.schema';
import {
  MaterialStockTransaction,
  StockTransactionType,
} from '../material-master/schemas/material-stock-transaction.schema';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import { Project } from '../projects/schemas/project.schema';
import { MaterialStockBalance } from '../stock-ledger/schemas/material-stock-balance.schema';
import { Vendor } from '../vendors/schemas/vendor.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import {
  ALL_CONSTRUCTION_REPORTS,
  CONSTRUCTION_REPORT_LABELS,
  ConstructionReportType,
} from './construction-reports.constants';
import type {
  ConstructionReportPayload,
  DrillDownLink,
  ReportFiltersApplied,
  ReportMeta,
} from './construction-reports.types';
import type { ConstructionReportsQueryDto } from './dto/construction-reports-query.dto';

const API = '/api/v1';

type ReportScope = {
  filters: ReportFiltersApplied;
  projectId: Types.ObjectId | null;
  from: Date | null;
  to: Date | null;
  contractorId: Types.ObjectId | null;
  vendorId: Types.ObjectId | null;
  materialId: Types.ObjectId | null;
};

@Injectable()
export class ConstructionReportsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(BoqVersion.name)
    private readonly boqVersionModel: Model<BoqVersion>,
    @InjectModel(BoqItem.name) private readonly boqItemModel: Model<BoqItem>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
    @InjectModel(GoodsReceipt.name)
    private readonly grnModel: Model<GoodsReceipt>,
    @InjectModel(MaterialIssue.name)
    private readonly issueModel: Model<MaterialIssue>,
    @InjectModel(MaterialStockBalance.name)
    private readonly stockBalanceModel: Model<MaterialStockBalance>,
    @InjectModel(MaterialStockTransaction.name)
    private readonly stockTxnModel: Model<MaterialStockTransaction>,
    @InjectModel(MaterialConsumptionReport.name)
    private readonly consumptionModel: Model<MaterialConsumptionReport>,
    @InjectModel(PurchaseOrder.name)
    private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(LabourAttendance.name)
    private readonly attendanceModel: Model<LabourAttendance>,
    @InjectModel(ManpowerShortfallAlert.name)
    private readonly shortfallModel: Model<ManpowerShortfallAlert>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
    @InjectModel(DprMissingAlert.name)
    private readonly dprMissingModel: Model<DprMissingAlert>,
  ) {}

  listReports() {
    return createSuccessResponse(
      ALL_CONSTRUCTION_REPORTS.map((reportType) => ({
        reportType,
        title: CONSTRUCTION_REPORT_LABELS[reportType],
        path: `${API}/construction-reports/${reportType}`,
        exportPath: `${API}/construction-reports/${reportType}/export`,
      })),
      'Construction management reports catalogue',
    );
  }

  async getReport(
    reportType: ConstructionReportType,
    query: ConstructionReportsQueryDto,
  ) {
    if (!ALL_CONSTRUCTION_REPORTS.includes(reportType)) {
      throw new BadRequestException(`Unknown report type: ${reportType}`);
    }
    const scope = await this.resolveScope(query);
    const payload = await this.buildReport(reportType, scope);
    return createSuccessResponse(
      payload,
      CONSTRUCTION_REPORT_LABELS[reportType],
    );
  }

  async buildReport(
    reportType: ConstructionReportType,
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    switch (reportType) {
      case ConstructionReportType.BoqBudgetVsActual:
        return this.boqBudgetVsActual(scope);
      case ConstructionReportType.PlannedVsActualProgress:
        return this.plannedVsActualProgress(scope);
      case ConstructionReportType.MaterialReceiptReport:
        return this.materialReceiptReport(scope);
      case ConstructionReportType.MaterialIssueReport:
        return this.materialIssueReport(scope);
      case ConstructionReportType.StockBalance:
        return this.stockBalance(scope);
      case ConstructionReportType.StockMovement:
        return this.stockMovement(scope);
      case ConstructionReportType.MaterialConsumptionVariance:
        return this.materialConsumptionVariance(scope);
      case ConstructionReportType.MaterialWastage:
        return this.materialWastage(scope);
      case ConstructionReportType.PurchaseCommitment:
        return this.purchaseCommitment(scope);
      case ConstructionReportType.OpenPurchaseOrders:
        return this.openPurchaseOrders(scope);
      case ConstructionReportType.VendorPerformance:
        return this.vendorPerformance(scope);
      case ConstructionReportType.LabourAttendance:
        return this.labourAttendance(scope);
      case ConstructionReportType.ContractorManpowerShortfall:
        return this.contractorManpowerShortfall(scope);
      case ConstructionReportType.ContractorProgress:
        return this.contractorProgress(scope);
      case ConstructionReportType.RunningBillRegister:
        return this.runningBillRegister(scope);
      case ConstructionReportType.DailyProgressSummary:
        return this.dailyProgressSummary(scope);
      case ConstructionReportType.ProjectDelayReport:
        return this.projectDelayReport(scope);
      default:
        throw new BadRequestException(`Unsupported report: ${reportType}`);
    }
  }

  // ─── scope ─────────────────────────────────────────────────────────────

  private async resolveScope(
    query: ConstructionReportsQueryDto,
  ): Promise<ReportScope> {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    if (from && Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (to && Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid to date');
    }
    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException('from must be on or before to');
    }

    let projectId: Types.ObjectId | null = null;
    let projectCode: string | null = null;
    let projectName: string | null = null;
    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      const project = await this.projectModel
        .findById(query.projectId)
        .select('projectCode projectName')
        .lean()
        .exec();
      if (!project) throw new NotFoundException('Project not found');
      projectId = project._id as Types.ObjectId;
      projectCode = project.projectCode ?? null;
      projectName = project.projectName ?? null;
    }

    const oid = (v?: string) =>
      v && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : null;

    return {
      projectId,
      from,
      to,
      contractorId: oid(query.contractorId),
      vendorId: oid(query.vendorId),
      materialId: oid(query.materialId),
      filters: {
        projectId: projectId ? String(projectId) : null,
        projectCode,
        projectName,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        contractorId: query.contractorId ?? null,
        vendorId: query.vendorId ?? null,
        materialId: query.materialId ?? null,
      },
    };
  }

  private meta(
    reportType: ConstructionReportType,
    scope: ReportScope,
  ): ReportMeta {
    return {
      reportType,
      title: CONSTRUCTION_REPORT_LABELS[reportType],
      filters: scope.filters,
      generatedAt: new Date().toISOString(),
    };
  }

  private requireProject(scope: ReportScope): Types.ObjectId {
    if (!scope.projectId) {
      throw new BadRequestException('projectId is required for this report');
    }
    return scope.projectId;
  }

  private applyDate(
    match: Record<string, unknown>,
    field: string,
    scope: ReportScope,
  ) {
    if (scope.from || scope.to) {
      const range: Record<string, Date> = {};
      if (scope.from) range.$gte = scope.from;
      if (scope.to) range.$lte = scope.to;
      match[field] = range;
    }
  }

  private link(label: string, href: string): DrillDownLink {
    return { label, href };
  }

  // ─── reports ───────────────────────────────────────────────────────────

  private async boqBudgetVsActual(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const projectId = this.requireProject(scope);
    const version = await this.boqVersionModel
      .findOne({ projectId, status: BoqVersionStatus.Active })
      .lean()
      .exec();
    if (!version) {
      return {
        meta: this.meta(ConstructionReportType.BoqBudgetVsActual, scope),
        rows: [],
        totals: { plannedValue: 0, actualValue: 0, variance: 0 },
      };
    }

    const items = await this.boqItemModel
      .find({ projectId, versionId: version._id })
      .lean()
      .exec();

    const measured = await this.workMeasurementModel
      .aggregate<{
        _id: Types.ObjectId;
        cumulative: number;
      }>([
        {
          $match: {
            projectId,
            status: WorkMeasurementStatus.Verified,
          },
        },
        {
          $group: {
            _id: '$boqItemId',
            cumulative: { $max: '$cumulativeQuantity' },
          },
        },
      ])
      .exec();
    const measuredMap = new Map(
      measured.map((m) => [String(m._id), m.cumulative ?? 0]),
    );

    let plannedValue = 0;
    let actualValue = 0;
    const rows = items.map((item) => {
      const plannedQty = item.plannedQuantity ?? 0;
      const rate = item.plannedRate ?? 0;
      const planned = this.round2(item.plannedValue ?? plannedQty * rate);
      const actualQty = measuredMap.get(String(item._id)) ?? 0;
      const actual = this.round2(actualQty * rate);
      plannedValue += planned;
      actualValue += actual;
      return {
        boqItemId: String(item._id),
        boqCode: item.boqCode,
        description: item.description,
        unit: item.unit,
        plannedQuantity: plannedQty,
        actualQuantity: this.round2(actualQty),
        plannedRate: rate,
        plannedValue: planned,
        actualValue: actual,
        varianceValue: this.round2(actual - planned),
        progressPercent:
          plannedQty > 0
            ? this.round2((actualQty / plannedQty) * 100)
            : 0,
        drillDown: [
          this.link(
            'Work measurements',
            `${API}/work-measurements?projectId=${projectId}&boqItemId=${String(item._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.BoqBudgetVsActual, scope),
      rows,
      totals: {
        plannedValue: this.round2(plannedValue),
        actualValue: this.round2(actualValue),
        variance: this.round2(actualValue - plannedValue),
        itemCount: rows.length,
      },
    };
  }

  private async plannedVsActualProgress(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const projectId = this.requireProject(scope);
    const rows = await this.workMeasurementModel
      .aggregate<{
        _id: Types.ObjectId;
        planned: number;
        measured: number;
      }>([
        {
          $match: {
            projectId,
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
      ])
      .exec();

    const items = await this.boqItemModel
      .find({ _id: { $in: rows.map((r) => r._id) } })
      .select('boqCode description')
      .lean()
      .exec();
    const itemMap = new Map(
      items.map((i) => [
        String(i._id),
        { boqCode: i.boqCode, description: i.description },
      ]),
    );

    let plannedTotal = 0;
    let measuredTotal = 0;
    const out = rows.map((r) => {
      const planned = r.planned ?? 0;
      const measured = r.measured ?? 0;
      plannedTotal += planned;
      measuredTotal += measured;
      const meta = itemMap.get(String(r._id));
      return {
        boqItemId: String(r._id),
        boqCode: meta?.boqCode ?? null,
        description: meta?.description ?? null,
        plannedQuantity: this.round2(planned),
        actualQuantity: this.round2(measured),
        progressPercent:
          planned > 0 ? this.round2((measured / planned) * 100) : 0,
        varianceQuantity: this.round2(measured - planned),
        drillDown: [
          this.link(
            'Work measurements',
            `${API}/work-measurements?projectId=${projectId}&boqItemId=${String(r._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.PlannedVsActualProgress, scope),
      rows: out,
      totals: {
        plannedQuantity: this.round2(plannedTotal),
        actualQuantity: this.round2(measuredTotal),
        progressPercent:
          plannedTotal > 0
            ? this.round2((measuredTotal / plannedTotal) * 100)
            : 0,
      },
    };
  }

  private async materialReceiptReport(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<GoodsReceipt> = {
      status: {
        $in: [
          GoodsReceiptStatus.Accepted,
          GoodsReceiptStatus.PartiallyAccepted,
          GoodsReceiptStatus.Posted,
          GoodsReceiptStatus.QualityCheck,
          GoodsReceiptStatus.Submitted,
        ],
      },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.vendorId) match.vendorId = scope.vendorId;
    this.applyDate(match, 'receivedDate', scope);

    const grns = await this.grnModel
      .find(match)
      .sort({ receivedDate: -1 })
      .limit(500)
      .lean()
      .exec();

    let receivedQty = 0;
    let acceptedQty = 0;
    let lineCount = 0;
    const rows = [];
    for (const grn of grns) {
      for (const item of grn.items ?? []) {
        if (
          scope.materialId &&
          String(item.materialId) !== String(scope.materialId)
        ) {
          continue;
        }
        lineCount += 1;
        receivedQty += item.receivedQuantity ?? 0;
        acceptedQty += item.acceptedQuantity ?? item.receivedQuantity ?? 0;
        rows.push({
          grnId: String(grn._id),
          grnNumber: grn.grnNumber,
          receivedDate: new Date(grn.receivedDate).toISOString(),
          projectId: String(grn.projectId),
          vendorId: String(grn.vendorId),
          purchaseOrderId: String(grn.purchaseOrderId),
          materialId: String(item.materialId),
          materialCode: item.materialCode,
          materialName: item.materialName,
          orderedQuantity: item.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          acceptedQuantity: item.acceptedQuantity,
          rejectedQuantity: item.rejectedQuantity,
          status: grn.status,
          drillDown: [
            this.link('Goods receipt', `${API}/goods-receipts/${String(grn._id)}`),
            this.link(
              'Purchase order',
              `${API}/purchase-orders/${String(grn.purchaseOrderId)}`,
            ),
          ],
        });
      }
    }

    return {
      meta: this.meta(ConstructionReportType.MaterialReceiptReport, scope),
      rows,
      totals: {
        grnCount: grns.length,
        lineCount,
        receivedQuantity: this.round2(receivedQty),
        acceptedQuantity: this.round2(acceptedQty),
      },
    };
  }

  private async materialIssueReport(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<MaterialIssue> = {
      status: {
        $in: [
          MaterialIssueStatus.Submitted,
          MaterialIssueStatus.Confirmed,
        ],
      },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.contractorId) match.contractorId = scope.contractorId;
    this.applyDate(match, 'issueDate', scope);

    const issues = await this.issueModel
      .find(match)
      .sort({ issueDate: -1 })
      .limit(500)
      .lean()
      .exec();

    let issuedQty = 0;
    let returnedQty = 0;
    let lineCount = 0;
    const rows = [];
    for (const issue of issues) {
      for (const item of issue.items ?? []) {
        if (
          scope.materialId &&
          String(item.materialId) !== String(scope.materialId)
        ) {
          continue;
        }
        lineCount += 1;
        issuedQty += item.baseUnitQuantity ?? 0;
        returnedQty += item.returnedBaseQuantity ?? 0;
        rows.push({
          issueId: String(issue._id),
          issueNumber: issue.issueNumber,
          issueDate: new Date(issue.issueDate).toISOString(),
          projectId: String(issue.projectId),
          contractorId: issue.contractorId
            ? String(issue.contractorId)
            : null,
          boqItemId: issue.boqItemId ? String(issue.boqItemId) : null,
          materialId: String(item.materialId),
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          baseUnitQuantity: item.baseUnitQuantity,
          returnedBaseQuantity: item.returnedBaseQuantity,
          netIssued: this.round2(
            (item.baseUnitQuantity ?? 0) - (item.returnedBaseQuantity ?? 0),
          ),
          status: issue.status,
          drillDown: [
            this.link(
              'Material issue',
              `${API}/material-issues/${String(issue._id)}`,
            ),
          ],
        });
      }
    }

    return {
      meta: this.meta(ConstructionReportType.MaterialIssueReport, scope),
      rows,
      totals: {
        issueCount: issues.length,
        lineCount,
        issuedQuantity: this.round2(issuedQty),
        returnedQuantity: this.round2(returnedQty),
        netIssued: this.round2(issuedQty - returnedQty),
      },
    };
  }

  private async stockBalance(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<MaterialStockBalance> = {};
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.materialId) match.materialId = scope.materialId;

    const balances = await this.stockBalanceModel
      .find(match)
      .sort({ projectId: 1, materialId: 1 })
      .lean()
      .exec();

    let totalQty = 0;
    const rows = balances.map((b) => {
      const qty = b.quantityInBaseUnit ?? 0;
      totalQty += qty;
      return {
        balanceId: String(b._id),
        projectId: String(b.projectId),
        materialId: String(b.materialId),
        location: b.location ?? '',
        quantityInBaseUnit: this.round2(qty),
        baseUnit: b.baseUnit,
        drillDown: [
          this.link(
            'Stock ledger',
            `${API}/stock-ledger?projectId=${String(b.projectId)}&materialId=${String(b.materialId)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.StockBalance, scope),
      rows,
      totals: {
        lineCount: rows.length,
        totalQuantity: this.round2(totalQty),
        positiveLines: rows.filter((r) => r.quantityInBaseUnit > 0).length,
      },
    };
  }

  private async stockMovement(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<MaterialStockTransaction> = {};
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.materialId) match.materialId = scope.materialId;
    this.applyDate(match, 'transactionDate', scope);

    const txns = await this.stockTxnModel
      .find(match)
      .sort({ transactionDate: -1 })
      .limit(1000)
      .lean()
      .exec();

    let qtyIn = 0;
    let qtyOut = 0;
    const rows = txns.map((t) => {
      qtyIn += t.quantityIn ?? 0;
      qtyOut += t.quantityOut ?? 0;
      return {
        transactionId: String(t._id),
        transactionDate: new Date(t.transactionDate).toISOString(),
        transactionType: t.transactionType,
        projectId: String(t.projectId),
        materialId: String(t.materialId),
        location: t.location ?? '',
        quantityIn: t.quantityIn ?? 0,
        quantityOut: t.quantityOut ?? 0,
        baseUnitQuantity: t.baseUnitQuantity ?? 0,
        referenceType: t.referenceType ?? null,
        referenceId: t.referenceId ? String(t.referenceId) : null,
        drillDown: [
          this.link(
            'Stock ledger',
            `${API}/stock-ledger?projectId=${String(t.projectId)}&materialId=${String(t.materialId)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.StockMovement, scope),
      rows,
      totals: {
        movementCount: rows.length,
        quantityIn: this.round2(qtyIn),
        quantityOut: this.round2(qtyOut),
        net: this.round2(qtyIn - qtyOut),
      },
    };
  }

  private async materialConsumptionVariance(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<MaterialConsumptionReport> = {
      status: {
        $in: [
          MaterialConsumptionReportStatus.Submitted,
          MaterialConsumptionReportStatus.Approved,
        ],
      },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    this.applyDate(match, 'asOfDate', scope);

    const reports = await this.consumptionModel
      .find(match)
      .sort({ asOfDate: -1 })
      .limit(100)
      .lean()
      .exec();

    let varianceValue = 0;
    let lineCount = 0;
    const rows = [];
    for (const report of reports) {
      for (const line of report.lines ?? []) {
        if (
          scope.materialId &&
          String(line.materialId) !== String(scope.materialId)
        ) {
          continue;
        }
        lineCount += 1;
        varianceValue += line.varianceValue ?? 0;
        rows.push({
          reportId: String(report._id),
          reportNumber: report.reportNumber,
          asOfDate: new Date(report.asOfDate).toISOString(),
          projectId: String(report.projectId),
          boqItemId: String(line.boqItemId),
          boqCode: line.boqCode,
          materialId: String(line.materialId),
          materialCode: line.materialCode,
          materialName: line.materialName,
          expectedConsumption: line.expectedConsumption,
          netActualConsumption: line.netActualConsumption,
          varianceQuantity: line.varianceQuantity,
          variancePercentage: line.variancePercentage,
          varianceValue: line.varianceValue,
          wastagePercentage: line.wastagePercentage,
          alerts: line.alerts,
          drillDown: [
            this.link(
              'Consumption report',
              `${API}/material-consumption/${String(report._id)}`,
            ),
          ],
        });
      }
    }

    return {
      meta: this.meta(
        ConstructionReportType.MaterialConsumptionVariance,
        scope,
      ),
      rows,
      totals: {
        reportCount: reports.length,
        lineCount,
        varianceValue: this.round2(varianceValue),
      },
    };
  }

  private async materialWastage(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<MaterialStockTransaction> = {
      transactionType: {
        $in: [
          StockTransactionType.Wastage,
          StockTransactionType.Damage,
          StockTransactionType.TheftOrShortage,
        ],
      },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.materialId) match.materialId = scope.materialId;
    this.applyDate(match, 'transactionDate', scope);

    const txns = await this.stockTxnModel
      .find(match)
      .sort({ transactionDate: -1 })
      .limit(500)
      .lean()
      .exec();

    // Also pull allowed wastage from latest consumption reports
    const consumption = await this.materialConsumptionVariance(scope);
    const allowedByMaterial = new Map<string, number>();
    for (const row of (consumption.rows as Array<{
      materialId: string;
      wastagePercentage: number;
    }>) ?? []) {
      allowedByMaterial.set(row.materialId, row.wastagePercentage ?? 0);
    }

    let wastageQty = 0;
    const rows = txns.map((t) => {
      const qty = t.quantityOut ?? t.baseUnitQuantity ?? 0;
      wastageQty += qty;
      return {
        transactionId: String(t._id),
        transactionDate: new Date(t.transactionDate).toISOString(),
        transactionType: t.transactionType,
        projectId: String(t.projectId),
        materialId: String(t.materialId),
        quantity: this.round2(qty),
        standardWastagePercentage:
          allowedByMaterial.get(String(t.materialId)) ?? null,
        drillDown: [
          this.link(
            'Stock movement',
            `${API}/stock-ledger?projectId=${String(t.projectId)}&materialId=${String(t.materialId)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.MaterialWastage, scope),
      rows,
      totals: {
        wastageEventCount: rows.length,
        wastageQuantity: this.round2(wastageQty),
      },
    };
  }

  private async purchaseCommitment(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<PurchaseOrder> = {
      status: {
        $in: [
          PurchaseOrderStatus.Issued,
          PurchaseOrderStatus.PartiallyReceived,
          PurchaseOrderStatus.PendingApproval,
        ],
      },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.vendorId) match.vendorId = scope.vendorId;

    const orders = await this.poModel
      .find(match)
      .sort({ expectedDeliveryDate: 1 })
      .lean()
      .exec();

    let committed = 0;
    let balance = 0;
    const rows = orders.map((po) => {
      committed += po.total ?? 0;
      balance += po.balanceAmount ?? 0;
      return {
        purchaseOrderId: String(po._id),
        purchaseOrderNumber: po.purchaseOrderNumber,
        projectId: String(po.projectId),
        vendorId: String(po.vendorId),
        status: po.status,
        total: po.total ?? 0,
        balanceAmount: po.balanceAmount ?? 0,
        balanceQuantity: po.balanceQuantity ?? 0,
        expectedDeliveryDate: po.expectedDeliveryDate
          ? new Date(po.expectedDeliveryDate).toISOString()
          : null,
        drillDown: [
          this.link(
            'Purchase order',
            `${API}/purchase-orders/${String(po._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.PurchaseCommitment, scope),
      rows,
      totals: {
        orderCount: rows.length,
        committedValue: this.round2(committed),
        openBalance: this.round2(balance),
      },
    };
  }

  private async openPurchaseOrders(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<PurchaseOrder> = {
      status: {
        $in: [
          PurchaseOrderStatus.Issued,
          PurchaseOrderStatus.PartiallyReceived,
        ],
      },
      balanceAmount: { $gt: 0 },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.vendorId) match.vendorId = scope.vendorId;

    const orders = await this.poModel
      .find(match)
      .sort({ expectedDeliveryDate: 1 })
      .lean()
      .exec();

    const asOf = scope.to ?? new Date();
    let openBalance = 0;
    let overdueCount = 0;
    const rows = orders.map((po) => {
      openBalance += po.balanceAmount ?? 0;
      const overdue =
        po.expectedDeliveryDate != null &&
        new Date(po.expectedDeliveryDate).getTime() < asOf.getTime();
      if (overdue) overdueCount += 1;
      return {
        purchaseOrderId: String(po._id),
        purchaseOrderNumber: po.purchaseOrderNumber,
        projectId: String(po.projectId),
        vendorId: String(po.vendorId),
        status: po.status,
        balanceAmount: po.balanceAmount ?? 0,
        balanceQuantity: po.balanceQuantity ?? 0,
        expectedDeliveryDate: po.expectedDeliveryDate
          ? new Date(po.expectedDeliveryDate).toISOString()
          : null,
        overdue,
        drillDown: [
          this.link(
            'Purchase order',
            `${API}/purchase-orders/${String(po._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.OpenPurchaseOrders, scope),
      rows,
      totals: {
        openOrderCount: rows.length,
        openBalance: this.round2(openBalance),
        overdueCount,
      },
    };
  }

  private async vendorPerformance(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const poMatch: FilterQuery<PurchaseOrder> = {
      status: {
        $nin: [
          PurchaseOrderStatus.Draft,
          PurchaseOrderStatus.Cancelled,
          PurchaseOrderStatus.Rejected,
          PurchaseOrderStatus.Superseded,
        ],
      },
    };
    if (scope.projectId) poMatch.projectId = scope.projectId;
    if (scope.vendorId) poMatch.vendorId = scope.vendorId;

    const orders = await this.poModel
      .find(poMatch)
      .select('_id vendorId expectedDeliveryDate status')
      .lean()
      .exec();
    const poIds = orders.map((o) => o._id as Types.ObjectId);

    const grns = poIds.length
      ? await this.grnModel
          .find({
            purchaseOrderId: { $in: poIds },
            status: {
              $in: [
                GoodsReceiptStatus.Accepted,
                GoodsReceiptStatus.PartiallyAccepted,
                GoodsReceiptStatus.Posted,
              ],
            },
          })
          .select('purchaseOrderId receivedDate vendorId')
          .lean()
          .exec()
      : [];

    const firstReceiptByPo = new Map<string, Date>();
    for (const g of grns) {
      const key = String(g.purchaseOrderId);
      const d = new Date(g.receivedDate);
      const prev = firstReceiptByPo.get(key);
      if (!prev || d < prev) firstReceiptByPo.set(key, d);
    }

    const byVendor = new Map<
      string,
      {
        vendorId: string;
        poCount: number;
        receivedCount: number;
        onTimeCount: number;
        lateCount: number;
      }
    >();

    for (const po of orders) {
      const vendorId = String(po.vendorId);
      const row = byVendor.get(vendorId) ?? {
        vendorId,
        poCount: 0,
        receivedCount: 0,
        onTimeCount: 0,
        lateCount: 0,
      };
      row.poCount += 1;
      const receipt = firstReceiptByPo.get(String(po._id));
      if (receipt) {
        row.receivedCount += 1;
        if (
          po.expectedDeliveryDate &&
          receipt.getTime() <= new Date(po.expectedDeliveryDate).getTime()
        ) {
          row.onTimeCount += 1;
        } else if (po.expectedDeliveryDate) {
          row.lateCount += 1;
        }
      }
      byVendor.set(vendorId, row);
    }

    const vendors = await this.vendorModel
      .find({
        _id: {
          $in: [...byVendor.keys()].map((id) => new Types.ObjectId(id)),
        },
      })
      .select('tradeName vendorCode rating')
      .lean()
      .exec();
    const vendorMap = new Map(
      vendors.map((v) => [
        String(v._id),
        {
          name: v.tradeName ?? v.vendorCode ?? String(v._id),
          rating: v.rating ?? null,
        },
      ]),
    );

    const rows = [...byVendor.values()].map((r) => {
      const meta = vendorMap.get(r.vendorId);
      const onTimePercent =
        r.receivedCount > 0
          ? this.round2((r.onTimeCount / r.receivedCount) * 100)
          : 0;
      return {
        vendorId: r.vendorId,
        vendorName: meta?.name ?? null,
        rating: meta?.rating ?? null,
        poCount: r.poCount,
        receivedCount: r.receivedCount,
        onTimeCount: r.onTimeCount,
        lateCount: r.lateCount,
        onTimePercent,
        drillDown: [
          this.link('Vendor', `${API}/vendors/${r.vendorId}`),
          this.link(
            'Purchase orders',
            `${API}/purchase-orders?vendorId=${r.vendorId}`,
          ),
        ],
      };
    });
    rows.sort((a, b) => b.onTimePercent - a.onTimePercent);

    return {
      meta: this.meta(ConstructionReportType.VendorPerformance, scope),
      rows,
      totals: {
        vendorCount: rows.length,
        poCount: rows.reduce((s, r) => s + r.poCount, 0),
        averageOnTimePercent: rows.length
          ? this.round2(
              rows.reduce((s, r) => s + r.onTimePercent, 0) / rows.length,
            )
          : 0,
      },
    };
  }

  private async labourAttendance(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<LabourAttendance> = {
      status: {
        $in: [
          LabourAttendanceStatus.Submitted,
          LabourAttendanceStatus.Confirmed,
        ],
      },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.contractorId) match.contractorId = scope.contractorId;
    this.applyDate(match, 'attendanceDate', scope);

    const sheets = await this.attendanceModel
      .find(match)
      .sort({ attendanceDate: -1 })
      .limit(500)
      .lean()
      .exec();

    let workerCount = 0;
    let overtimeHours = 0;
    const rows = sheets.map((s) => {
      let sheetWorkers = 0;
      let sheetOt = 0;
      for (const line of s.lines ?? []) {
        sheetWorkers += line.workerCount ?? 0;
        sheetOt += line.overtimeHours ?? 0;
      }
      workerCount += sheetWorkers;
      overtimeHours += sheetOt;
      return {
        attendanceId: String(s._id),
        attendanceNumber: s.attendanceNumber,
        attendanceDate: new Date(s.attendanceDate).toISOString(),
        projectId: String(s.projectId),
        contractorId: String(s.contractorId),
        workerCount: sheetWorkers,
        overtimeHours: this.round2(sheetOt),
        status: s.status,
        drillDown: [
          this.link(
            'Attendance sheet',
            `${API}/labour-attendance/${String(s._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.LabourAttendance, scope),
      rows,
      totals: {
        sheetCount: rows.length,
        workerCount,
        overtimeHours: this.round2(overtimeHours),
      },
    };
  }

  private async contractorManpowerShortfall(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<ManpowerShortfallAlert> = {};
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.contractorId) match.contractorId = scope.contractorId;
    this.applyDate(match, 'asOfDate', scope);

    const alerts = await this.shortfallModel
      .find(match)
      .sort({ asOfDate: -1 })
      .limit(200)
      .lean()
      .exec();

    const rows = alerts.map((a) => ({
      alertId: String(a._id),
      projectId: String(a.projectId),
      contractorId: a.contractorId ? String(a.contractorId) : null,
      asOfDate: a.asOfDate ? new Date(a.asOfDate).toISOString() : null,
      alertType: a.alertType,
      message: a.message,
      shortfallPercent: a.shortfallPercent ?? null,
      consecutiveDays: a.consecutiveDays ?? null,
      recommendedEscalation: a.recommendedEscalation ?? null,
      acknowledged: a.acknowledged ?? false,
      drillDown: [
        this.link(
          'Shortfall alerts',
          `${API}/manpower-planning/shortfall-alerts?projectId=${String(a.projectId)}`,
        ),
      ],
    }));

    return {
      meta: this.meta(
        ConstructionReportType.ContractorManpowerShortfall,
        scope,
      ),
      rows,
      totals: {
        alertCount: rows.length,
        unacknowledged: rows.filter((r) => !r.acknowledged).length,
      },
    };
  }

  private async contractorProgress(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const projectId = this.requireProject(scope);
    const match: FilterQuery<WorkMeasurement> = {
      projectId,
      status: WorkMeasurementStatus.Verified,
    };
    if (scope.contractorId) match.contractorId = scope.contractorId;

    const measured = await this.workMeasurementModel
      .aggregate<{
        _id: Types.ObjectId;
        planned: number;
        measured: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: {
              contractorId: '$contractorId',
              boqItemId: '$boqItemId',
            },
            planned: { $max: '$boqPlannedQuantity' },
            measured: { $max: '$cumulativeQuantity' },
          },
        },
        {
          $group: {
            _id: '$_id.contractorId',
            planned: { $sum: '$planned' },
            measured: { $sum: '$measured' },
          },
        },
      ])
      .exec();

    const billMatch: FilterQuery<ContractorBill> = {
      projectId,
      status: {
        $in: [
          ContractorBillStatus.Posted,
          ContractorBillStatus.DirectorApproved,
          ContractorBillStatus.FinanceVerified,
          ContractorBillStatus.PmCertified,
          ContractorBillStatus.Paid,
        ],
      },
    };
    if (scope.contractorId) billMatch.contractorId = scope.contractorId;
    const bills = await this.contractorBillModel
      .aggregate<{ _id: Types.ObjectId; certified: number }>([
        { $match: billMatch },
        {
          $group: {
            _id: '$contractorId',
            certified: { $sum: '$currentCertifiedValue' },
          },
        },
      ])
      .exec();
    const certifiedMap = new Map(
      bills.map((b) => [String(b._id), b.certified ?? 0]),
    );

    const contractorIds = [
      ...new Set([
        ...measured.map((m) => String(m._id)),
        ...certifiedMap.keys(),
      ]),
    ];
    const contractors = await this.contractorModel
      .find({
        _id: { $in: contractorIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('tradeName contractorCode rating')
      .lean()
      .exec();
    const nameMap = new Map(
      contractors.map((c) => [
        String(c._id),
        {
          name: c.tradeName ?? c.contractorCode ?? String(c._id),
          rating: c.rating ?? null,
        },
      ]),
    );

    const measuredMap = new Map(
      measured.map((m) => [String(m._id), m]),
    );

    const rows = contractorIds.map((id) => {
      const m = measuredMap.get(id);
      const planned = m?.planned ?? 0;
      const actual = m?.measured ?? 0;
      const meta = nameMap.get(id);
      return {
        contractorId: id,
        contractorName: meta?.name ?? null,
        rating: meta?.rating ?? null,
        plannedQuantity: this.round2(planned),
        measuredQuantity: this.round2(actual),
        progressPercent:
          planned > 0 ? this.round2((actual / planned) * 100) : 0,
        certifiedValue: this.round2(certifiedMap.get(id) ?? 0),
        drillDown: [
          this.link('Contractor', `${API}/contractors/${id}`),
          this.link(
            'Performance',
            `${API}/contractors/${id}/performance`,
          ),
        ],
      };
    });
    rows.sort((a, b) => b.progressPercent - a.progressPercent);

    return {
      meta: this.meta(ConstructionReportType.ContractorProgress, scope),
      rows,
      totals: {
        contractorCount: rows.length,
        certifiedValue: this.round2(
          rows.reduce((s, r) => s + r.certifiedValue, 0),
        ),
      },
    };
  }

  private async runningBillRegister(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<ContractorBill> = {
      status: { $ne: ContractorBillStatus.Cancelled },
    };
    if (scope.projectId) match.projectId = scope.projectId;
    if (scope.contractorId) match.contractorId = scope.contractorId;

    const bills = await this.contractorBillModel
      .find(match)
      .sort({ raNumber: 1, createdAt: 1 })
      .lean()
      .exec();

    let certified = 0;
    let netPayable = 0;
    let paid = 0;
    const rows = bills.map((b) => {
      certified += b.currentCertifiedValue ?? 0;
      netPayable += b.netPayable ?? 0;
      paid += b.paidAmount ?? 0;
      return {
        billId: String(b._id),
        billNumber: b.billNumber,
        raNumber: b.raNumber,
        projectId: String(b.projectId),
        contractorId: String(b.contractorId),
        status: b.status,
        previousCertifiedValue: b.previousCertifiedValue ?? 0,
        currentCertifiedValue: b.currentCertifiedValue ?? 0,
        cumulativeValue: b.cumulativeValue ?? 0,
        netPayable: b.netPayable ?? 0,
        paidAmount: b.paidAmount ?? 0,
        outstanding: this.round2(
          (b.netPayable ?? 0) - (b.paidAmount ?? 0),
        ),
        drillDown: [
          this.link(
            'Running bill',
            `${API}/contractor-bills/${String(b._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.RunningBillRegister, scope),
      rows,
      totals: {
        billCount: rows.length,
        currentCertifiedValue: this.round2(certified),
        netPayable: this.round2(netPayable),
        paidAmount: this.round2(paid),
        outstanding: this.round2(netPayable - paid),
      },
    };
  }

  private async dailyProgressSummary(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const match: FilterQuery<DailyProgressReport> = {};
    if (scope.projectId) match.projectId = scope.projectId;
    this.applyDate(match, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(match)
      .sort({ reportDate: -1 })
      .limit(200)
      .lean()
      .exec();

    let hoursLost = 0;
    let skilled = 0;
    let unskilled = 0;
    const rows = dprs.map((d) => {
      const delayHours = (d.delays ?? []).reduce(
        (s, x) => s + (x.hoursLost ?? 0),
        0,
      );
      hoursLost += delayHours;
      skilled += d.skilledLabourCount ?? 0;
      unskilled += d.unskilledLabourCount ?? 0;
      const boqQty = (d.boqQuantities ?? []).reduce(
        (s, q) => s + (q.quantityCompleted ?? 0),
        0,
      );
      return {
        dprId: String(d._id),
        reportDate: new Date(d.reportDate).toISOString(),
        projectId: String(d.projectId),
        status: d.status,
        skilledLabourCount: d.skilledLabourCount ?? 0,
        unskilledLabourCount: d.unskilledLabourCount ?? 0,
        boqQuantityCompleted: this.round2(boqQty),
        delayHours: this.round2(delayHours),
        delayCount: d.delays?.length ?? 0,
        weather: d.weather ?? null,
        drillDown: [
          this.link(
            'Daily progress report',
            `${API}/daily-progress-reports/${String(d._id)}`,
          ),
        ],
      };
    });

    return {
      meta: this.meta(ConstructionReportType.DailyProgressSummary, scope),
      rows,
      totals: {
        dprCount: rows.length,
        skilledLabourCount: skilled,
        unskilledLabourCount: unskilled,
        delayHours: this.round2(hoursLost),
      },
    };
  }

  private async projectDelayReport(
    scope: ReportScope,
  ): Promise<ConstructionReportPayload> {
    const projectFilter: FilterQuery<Project> = {};
    if (scope.projectId) projectFilter._id = scope.projectId;

    const projects = await this.projectModel
      .find(projectFilter)
      .select(
        'projectCode projectName startDate expectedCompletionDate actualCompletionDate status projectStage',
      )
      .lean()
      .exec();

    const asOf = scope.to ?? new Date();
    const rows = [];

    for (const p of projects) {
      const projectId = String(p._id);
      const dprMatch: FilterQuery<DailyProgressReport> = {
        projectId: p._id,
      };
      this.applyDate(dprMatch, 'reportDate', scope);
      const dprs = await this.dprModel
        .find(dprMatch)
        .select('delays reportDate')
        .lean()
        .exec();
      const delayHours = dprs.reduce(
        (s, d) =>
          s +
          (d.delays ?? []).reduce((ss, x) => ss + (x.hoursLost ?? 0), 0),
        0,
      );

      const missing = await this.dprMissingModel
        .countDocuments({
          projectId: p._id,
          ...(scope.from || scope.to
            ? {
                reportDate: {
                  ...(scope.from ? { $gte: scope.from } : {}),
                  ...(scope.to ? { $lte: scope.to } : {}),
                },
              }
            : {}),
        })
        .exec();

      const expected = p.expectedCompletionDate
        ? new Date(p.expectedCompletionDate)
        : null;
      const actual = p.actualCompletionDate
        ? new Date(p.actualCompletionDate)
        : null;
      const daysOverdue =
        expected && !actual && expected.getTime() < asOf.getTime()
          ? Math.floor(
              (asOf.getTime() - expected.getTime()) /
                (24 * 60 * 60 * 1000),
            )
          : expected && actual && actual.getTime() > expected.getTime()
            ? Math.floor(
                (actual.getTime() - expected.getTime()) /
                  (24 * 60 * 60 * 1000),
              )
            : 0;

      rows.push({
        projectId,
        projectCode: p.projectCode,
        projectName: p.projectName,
        status: p.status,
        projectStage: p.projectStage,
        startDate: p.startDate
          ? new Date(p.startDate).toISOString()
          : null,
        expectedCompletionDate: expected?.toISOString() ?? null,
        actualCompletionDate: actual?.toISOString() ?? null,
        daysOverdue,
        dprDelayHours: this.round2(delayHours),
        missingDprCount: missing,
        delayed: daysOverdue > 0 || delayHours > 0 || missing > 0,
        drillDown: [
          this.link(
            'Daily progress reports',
            `${API}/daily-progress-reports?projectId=${projectId}`,
          ),
          this.link('Project', `${API}/projects/${projectId}`),
        ],
      });
    }

    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      meta: this.meta(ConstructionReportType.ProjectDelayReport, scope),
      rows,
      totals: {
        projectCount: rows.length,
        delayedProjects: rows.filter((r) => r.delayed).length,
        totalDelayHours: this.round2(
          rows.reduce((s, r) => s + r.dprDelayHours, 0),
        ),
        missingDprCount: rows.reduce((s, r) => s + r.missingDprCount, 0),
      },
    };
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
