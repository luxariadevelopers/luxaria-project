import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import {
  BoqVersion,
  BoqVersionStatus,
} from '../boq/schemas/boq.schema';
import {
  BankAccountStatus,
  CompanyBankAccount,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  CashAccount,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  CustomerReceipt,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  DailyProgressReport,
  DprMissingAlert,
  DprStatus,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  LabourAttendance,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import { ManpowerShortfallAlert } from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  CommitmentStatus,
  ContributionCommitment,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import {
  ProjectDocumentCategory,
  ProjectFile,
} from '../projects/schemas/project-document.schema';
import { Project } from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import { MaterialStockBalance } from '../stock-ledger/schemas/material-stock-balance.schema';
import {
  StockReorderAlert,
  StockReorderAlertStatus,
} from '../stock-reorder/schemas/stock-reorder-alert.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  WorkMeasurement,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import type { ProjectDashboardQueryDto } from './dto/project-dashboard-query.dto';
import type {
  ContractorProgressRow,
  CriticalAlert,
  DrillDownLink,
  MoneyTile,
  PercentTile,
  ProjectDashboardSummary,
  SitePhotoItem,
} from './project-dashboard.types';

const API = '/api/v1';

type DateScope = {
  projectOid: Types.ObjectId;
  projectId: string;
  dayStart: Date;
  dayEnd: Date;
  rangeFrom: Date | null;
  rangeTo: Date | null;
};

@Injectable()
export class ProjectDashboardService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(BoqVersion.name)
    private readonly boqVersionModel: Model<BoqVersion>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(CustomerReceipt.name)
    private readonly customerReceiptModel: Model<CustomerReceipt>,
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(MaterialStockBalance.name)
    private readonly stockBalanceModel: Model<MaterialStockBalance>,
    @InjectModel(LabourAttendance.name)
    private readonly labourAttendanceModel: Model<LabourAttendance>,
    @InjectModel(ProjectFile.name)
    private readonly projectFileModel: Model<ProjectFile>,
    @InjectModel(DailyProgressReport.name)
    private readonly dprModel: Model<DailyProgressReport>,
    @InjectModel(StockReorderAlert.name)
    private readonly stockAlertModel: Model<StockReorderAlert>,
    @InjectModel(ManpowerShortfallAlert.name)
    private readonly manpowerAlertModel: Model<ManpowerShortfallAlert>,
    @InjectModel(DprMissingAlert.name)
    private readonly dprMissingModel: Model<DprMissingAlert>,
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseRequestModel: Model<PurchaseRequest>,
  ) {}

  async getDashboard(projectId: string, query: ProjectDashboardQueryDto) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId');
    }

    const project = await this.projectModel.findById(projectId).lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const scope = this.resolveDates(projectId, query);
    const pid = scope.projectOid;

    const [
      physical,
      revisedBudget,
      actualCost,
      committed,
      customerCollections,
      investorFunding,
      bankBalance,
      cashBalance,
      materialStock,
      labourAttendance,
      contractorProgress,
      vendorDues,
      purchaseOrders,
      sitePhotos,
    ] = await Promise.all([
      this.physicalCompletion(pid),
      this.revisedBudget(pid),
      this.actualCost(pid, scope),
      this.committedCost(pid),
      this.customerCollections(pid, scope),
      this.investorFunding(pid, scope),
      this.bankBalance(pid, scope),
      this.cashBalance(pid, scope),
      this.materialStock(pid),
      this.labourAttendance(pid, scope),
      this.contractorProgress(pid),
      this.vendorDues(pid),
      this.purchaseOrders(pid),
      this.sitePhotos(pid, scope),
    ]);

    const approvedBudgetAmount = this.round2(project.approvedBudget ?? 0);
    const budgetForFinancial =
      revisedBudget.amount > 0 ? revisedBudget.amount : approvedBudgetAmount;

    const forecastAmount = this.round2(
      Math.max(0, budgetForFinancial - actualCost.amount - committed.amount),
    );
    const projectedFinal = this.round2(
      actualCost.amount + committed.amount + forecastAmount,
    );

    const financialCompletion = this.percentTile(
      actualCost.amount,
      budgetForFinancial,
      [
        this.link('Vendor invoices', `${API}/vendor-invoices?projectId=${projectId}`),
        this.link(
          'Contractor bills',
          `${API}/contractor-bills?projectId=${projectId}`,
        ),
        this.link(
          'Active BOQ',
          `${API}/boq/projects/${projectId}/versions/active`,
        ),
      ],
    );

    const criticalAlerts = await this.criticalAlerts(
      projectId,
      pid,
      vendorDues,
    );

    const summary: ProjectDashboardSummary = {
      filters: {
        projectId,
        date: scope.dayStart.toISOString(),
        from: scope.rangeFrom?.toISOString() ?? null,
        to: scope.rangeTo?.toISOString() ?? null,
      },
      project: {
        id: projectId,
        projectCode: project.projectCode,
        projectName: project.projectName,
        projectStage: project.projectStage,
        status: project.status,
      },
      projectStage: {
        stage: project.projectStage,
        status: project.status,
        drillDown: [
          this.link('Project details', `${API}/projects/${projectId}`),
        ],
      },
      physicalCompletion: physical,
      financialCompletion,
      approvedBudget: this.moneyTile(approvedBudgetAmount, undefined, [
        this.link('Project details', `${API}/projects/${projectId}`),
      ]),
      revisedBudget,
      actualCost,
      committedCost: committed,
      forecastCostToComplete: this.moneyTile(forecastAmount, undefined, [
        this.link(
          'Purchase orders',
          `${API}/purchase-orders?projectId=${projectId}`,
        ),
        this.link(
          'Active BOQ',
          `${API}/boq/projects/${projectId}/versions/active`,
        ),
      ]),
      projectedFinalCost: this.moneyTile(projectedFinal, undefined, [
        this.link(
          'Active BOQ',
          `${API}/boq/projects/${projectId}/versions/active`,
        ),
        this.link(
          'Vendor invoices',
          `${API}/vendor-invoices?projectId=${projectId}`,
        ),
      ]),
      customerCollections,
      investorFunding,
      bankBalance,
      cashBalance,
      materialStock,
      labourAttendance,
      contractorProgress,
      vendorDues,
      purchaseOrders,
      sitePhotos,
      criticalAlerts,
    };

    return createSuccessResponse(summary, 'Project dashboard summary');
  }

  // ─── tiles ─────────────────────────────────────────────────────────────

  private async physicalCompletion(
    projectOid: Types.ObjectId,
  ): Promise<PercentTile> {
    const projectId = String(projectOid);
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

    return this.percentTile(row?.measured ?? 0, row?.planned ?? 0, [
      this.link(
        'Work measurements',
        `${API}/work-measurements?projectId=${projectId}`,
      ),
      this.link(
        'Daily progress reports',
        `${API}/daily-progress-reports?projectId=${projectId}`,
      ),
    ]);
  }

  private async revisedBudget(projectOid: Types.ObjectId): Promise<MoneyTile> {
    const projectId = String(projectOid);
    const active = await this.boqVersionModel
      .findOne({
        projectId: projectOid,
        status: BoqVersionStatus.Active,
      })
      .select('totalPlannedValue')
      .lean()
      .exec();

    return this.moneyTile(this.round2(active?.totalPlannedValue ?? 0), 1, [
      this.link(
        'Active BOQ',
        `${API}/boq/projects/${projectId}/versions/active`,
      ),
      this.link('BOQ versions', `${API}/boq/projects/${projectId}/versions`),
    ]);
  }

  private async actualCost(
    projectOid: Types.ObjectId,
    scope: DateScope,
  ): Promise<MoneyTile> {
    const projectId = String(projectOid);

    const vendorMatch: FilterQuery<VendorInvoice> = {
      projectId: projectOid,
      status: {
        $in: [VendorInvoiceStatus.Posted, VendorInvoiceStatus.Paid],
      },
    };
    this.applyRange(vendorMatch, 'invoiceDate', scope);

    const contractorMatch: FilterQuery<ContractorBill> = {
      projectId: projectOid,
      status: {
        $in: [ContractorBillStatus.Posted, ContractorBillStatus.Paid],
      },
    };
    if (scope.rangeFrom || scope.rangeTo) {
      contractorMatch.postedAt = {};
      if (scope.rangeFrom) {
        (contractorMatch.postedAt as Record<string, Date>).$gte =
          scope.rangeFrom;
      }
      if (scope.rangeTo) {
        (contractorMatch.postedAt as Record<string, Date>).$lte = scope.rangeTo;
      }
    }

    const [vendorAgg] = await this.vendorInvoiceModel
      .aggregate<{ total: number; count: number }>([
        { $match: vendorMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const [contractorAgg] = await this.contractorBillModel
      .aggregate<{ total: number; count: number }>([
        { $match: contractorMatch },
        {
          $group: {
            _id: null,
            total: { $sum: '$currentCertifiedValue' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const amount = this.round2(
      (vendorAgg?.total ?? 0) + (contractorAgg?.total ?? 0),
    );
    const count = (vendorAgg?.count ?? 0) + (contractorAgg?.count ?? 0);

    return this.moneyTile(amount, count, [
      this.link('Vendor invoices', `${API}/vendor-invoices?projectId=${projectId}`),
      this.link(
        'Contractor bills',
        `${API}/contractor-bills?projectId=${projectId}`,
      ),
    ]);
  }

  private async committedCost(
    projectOid: Types.ObjectId,
  ): Promise<MoneyTile> {
    const projectId = String(projectOid);
    const [agg] = await this.purchaseOrderModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectOid,
            status: {
              $in: [
                PurchaseOrderStatus.Issued,
                PurchaseOrderStatus.PartiallyReceived,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$balanceAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return this.moneyTile(this.round2(agg?.total ?? 0), agg?.count ?? 0, [
      this.link(
        'Open purchase orders',
        `${API}/purchase-orders?projectId=${projectId}&status=issued`,
      ),
    ]);
  }

  private async customerCollections(
    projectOid: Types.ObjectId,
    scope: DateScope,
  ): Promise<MoneyTile> {
    const projectId = String(projectOid);
    const match: FilterQuery<CustomerReceipt> = {
      projectId: projectOid,
      status: CustomerReceiptStatus.Posted,
    };
    this.applyRange(match, 'receiptDate', scope, true);

    const [agg] = await this.customerReceiptModel
      .aggregate<{ total: number; count: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return this.moneyTile(this.round2(agg?.total ?? 0), agg?.count ?? 0, [
      this.link(
        'Customer receipts',
        `${API}/customer-receipts?projectId=${projectId}`,
      ),
    ]);
  }

  private async investorFunding(
    projectOid: Types.ObjectId,
    scope: DateScope,
  ) {
    const projectId = String(projectOid);
    const participants = await this.participantModel
      .find({
        projectId: projectOid,
        participantType: {
          $in: [
            ParticipantType.OutsideInvestor,
            ParticipantType.Director,
            ParticipantType.Company,
            ParticipantType.JointVentureParty,
          ],
        },
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
      .select('_id participantType')
      .lean()
      .exec();

    // Investor funding tile focuses on outside investors; directors shown via commitments too.
    const investorIds = participants
      .filter((p) => p.participantType === ParticipantType.OutsideInvestor)
      .map((p) => p._id as Types.ObjectId);

    const filter: FilterQuery<ContributionCommitment> = {
      projectId: projectOid,
      status: CommitmentStatus.Approved,
      ...(investorIds.length
        ? { participantId: { $in: investorIds } }
        : { participantId: { $in: [] } }),
    };
    this.applyRange(filter, 'commitmentDate', scope);

    const rows = investorIds.length
      ? await this.commitmentModel
          .find(filter)
          .select('commitmentAmount receivedAmount')
          .lean()
          .exec()
      : [];

    const committedAmount = this.round2(
      rows.reduce((s, r) => s + (r.commitmentAmount ?? 0), 0),
    );
    const receivedAmount = this.round2(
      rows.reduce((s, r) => s + (r.receivedAmount ?? 0), 0),
    );

    return {
      committedAmount,
      receivedAmount,
      pendingAmount: this.round2(Math.max(0, committedAmount - receivedAmount)),
      commitmentCount: rows.length,
      drillDown: [
        this.link(
          'Project commitments',
          `${API}/projects/${projectId}/commitments`,
        ),
        this.link(
          'Contribution receipts',
          `${API}/projects/${projectId}/contribution-receipts`,
        ),
        this.link(
          'Commitment summary',
          `${API}/projects/${projectId}/commitments/summary`,
        ),
      ],
    };
  }

  private async bankBalance(
    projectOid: Types.ObjectId,
    scope: DateScope,
  ): Promise<MoneyTile> {
    const projectId = String(projectOid);
    const accounts = await this.bankModel
      .find({
        projectId: projectOid,
        status: BankAccountStatus.Active,
      })
      .select('_id ledgerAccountId openingBalance')
      .lean()
      .exec();

    const amount = await this.sumAccountBalances(accounts, scope.dayEnd);
    return this.moneyTile(amount, accounts.length, [
      this.link(
        'Project bank accounts',
        `${API}/company-bank-accounts?projectId=${projectId}`,
      ),
    ]);
  }

  private async cashBalance(
    projectOid: Types.ObjectId,
    scope: DateScope,
  ): Promise<MoneyTile> {
    const projectId = String(projectOid);
    const accounts = await this.cashModel
      .find({
        projectId: projectOid,
        status: { $ne: CashAccountStatus.Closed },
      })
      .select('_id ledgerAccountId openingBalance')
      .lean()
      .exec();

    const amount = await this.sumAccountBalances(accounts, scope.dayEnd);
    return this.moneyTile(amount, accounts.length, [
      this.link('Cash accounts', `${API}/cash-accounts?projectId=${projectId}`),
    ]);
  }

  private async materialStock(projectOid: Types.ObjectId) {
    const projectId = String(projectOid);
    const [agg] = await this.stockBalanceModel
      .aggregate<{
        materialCount: number;
        totalQuantity: number;
        locations: number;
      }>([
        {
          $match: {
            projectId: projectOid,
            quantityInBaseUnit: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            materialCount: { $addToSet: '$materialId' },
            totalQuantity: { $sum: '$quantityInBaseUnit' },
            locations: { $addToSet: '$location' },
          },
        },
        {
          $project: {
            materialCount: { $size: '$materialCount' },
            totalQuantity: 1,
            locations: { $size: '$locations' },
          },
        },
      ])
      .exec();

    return {
      materialCount: agg?.materialCount ?? 0,
      totalQuantity: this.round2(agg?.totalQuantity ?? 0),
      locations: agg?.locations ?? 0,
      drillDown: [
        this.link(
          'Stock balances',
          `${API}/stock-ledger/balance?projectId=${projectId}`,
        ),
        this.link(
          'Stock reorder alerts',
          `${API}/stock-reorder/alerts?projectId=${projectId}`,
        ),
      ],
    };
  }

  private async labourAttendance(
    projectOid: Types.ObjectId,
    scope: DateScope,
  ) {
    const projectId = String(projectOid);
    const sheets = await this.labourAttendanceModel
      .find({
        projectId: projectOid,
        attendanceDate: { $gte: scope.dayStart, $lte: scope.dayEnd },
        status: {
          $in: [
            LabourAttendanceStatus.Submitted,
            LabourAttendanceStatus.Confirmed,
          ],
        },
      })
      .select('status lines')
      .lean()
      .exec();

    let totalWorkers = 0;
    let confirmedSheets = 0;
    let submittedSheets = 0;
    for (const sheet of sheets) {
      const workers = (sheet.lines ?? []).reduce(
        (s, line) => s + (line.workerCount ?? 0),
        0,
      );
      totalWorkers += workers;
      if (sheet.status === LabourAttendanceStatus.Confirmed) {
        confirmedSheets += 1;
      } else {
        submittedSheets += 1;
      }
    }

    const dateQs = scope.dayStart.toISOString().slice(0, 10);
    return {
      asOfDate: scope.dayStart.toISOString(),
      sheetCount: sheets.length,
      totalWorkers,
      confirmedSheets,
      submittedSheets,
      drillDown: [
        this.link(
          'Daily attendance report',
          `${API}/labour-attendance/daily-report?projectId=${projectId}&date=${dateQs}`,
        ),
        this.link(
          'Labour attendance',
          `${API}/labour-attendance?projectId=${projectId}`,
        ),
      ],
    };
  }

  private async contractorProgress(
    projectOid: Types.ObjectId,
  ): Promise<ContractorProgressRow[]> {
    const projectId = String(projectOid);
    const measured = await this.workMeasurementModel
      .aggregate<{
        _id: Types.ObjectId;
        planned: number;
        measured: number;
      }>([
        {
          $match: {
            projectId: projectOid,
            status: WorkMeasurementStatus.Verified,
          },
        },
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

    const certified = await this.contractorBillModel
      .aggregate<{ _id: Types.ObjectId; value: number }>([
        {
          $match: {
            projectId: projectOid,
            status: {
              $in: [
                ContractorBillStatus.Posted,
                ContractorBillStatus.Paid,
                ContractorBillStatus.DirectorApproved,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$contractorId',
            value: { $sum: '$currentCertifiedValue' },
          },
        },
      ])
      .exec();

    const certifiedMap = new Map(
      certified.map((c) => [String(c._id), this.round2(c.value ?? 0)]),
    );

    return measured
      .map((m) => {
        const contractorId = String(m._id);
        const plannedQuantity = this.round2(m.planned ?? 0);
        const measuredQuantity = this.round2(m.measured ?? 0);
        const progressPercent =
          plannedQuantity > 0
            ? this.round2((measuredQuantity / plannedQuantity) * 100)
            : 0;
        return {
          contractorId,
          measuredQuantity,
          plannedQuantity,
          progressPercent,
          certifiedValue: certifiedMap.get(contractorId) ?? 0,
          drillDown: [
            this.link(
              'Contractor performance',
              `${API}/contractors/${contractorId}/performance`,
            ),
            this.link(
              'Work measurements',
              `${API}/work-measurements?projectId=${projectId}&contractorId=${contractorId}`,
            ),
          ],
        };
      })
      .sort((a, b) => b.progressPercent - a.progressPercent);
  }

  private async vendorDues(projectOid: Types.ObjectId): Promise<MoneyTile> {
    const projectId = String(projectOid);
    const rows = await this.vendorInvoiceModel
      .find({
        projectId: projectOid,
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let amount = 0;
    let count = 0;
    for (const r of rows) {
      const remaining = this.round2(
        (r.totalAmount ?? 0) -
          (r.tds ?? 0) -
          (r.retention ?? 0) -
          (r.paidAmount ?? 0),
      );
      if (remaining > 0) {
        amount += remaining;
        count += 1;
      }
    }

    return this.moneyTile(this.round2(amount), count, [
      this.link('Vendor invoices', `${API}/vendor-invoices?projectId=${projectId}`),
      this.link(
        'Vendor payments',
        `${API}/vendor-payments?projectId=${projectId}`,
      ),
    ]);
  }

  private async purchaseOrders(projectOid: Types.ObjectId) {
    const projectId = String(projectOid);
    const openStatuses = [
      PurchaseOrderStatus.Issued,
      PurchaseOrderStatus.PartiallyReceived,
      PurchaseOrderStatus.FullyReceived,
      PurchaseOrderStatus.PendingApproval,
    ];

    const rows = await this.purchaseOrderModel
      .find({
        projectId: projectOid,
        status: { $in: openStatuses },
      })
      .select('status total balanceAmount')
      .lean()
      .exec();

    let totalValue = 0;
    let openBalance = 0;
    let issuedCount = 0;
    for (const r of rows) {
      totalValue += r.total ?? 0;
      openBalance += r.balanceAmount ?? 0;
      if (
        r.status === PurchaseOrderStatus.Issued ||
        r.status === PurchaseOrderStatus.PartiallyReceived
      ) {
        issuedCount += 1;
      }
    }

    return {
      count: rows.length,
      issuedCount,
      totalValue: this.round2(totalValue),
      openBalance: this.round2(openBalance),
      drillDown: [
        this.link(
          'Purchase orders',
          `${API}/purchase-orders?projectId=${projectId}`,
        ),
      ],
    };
  }

  private async sitePhotos(projectOid: Types.ObjectId, scope: DateScope) {
    const projectId = String(projectOid);

    const docs = await this.projectFileModel
      .find({
        projectId: projectOid,
        category: ProjectDocumentCategory.Photo,
      })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean()
      .exec();

    const dprMatch: FilterQuery<DailyProgressReport> = {
      projectId: projectOid,
      status: { $ne: DprStatus.Draft },
      photoDocumentIds: { $exists: true, $ne: [] },
    };
    this.applyRange(dprMatch, 'reportDate', scope);

    const dprs = await this.dprModel
      .find(dprMatch)
      .select('reportDate photoDocumentIds')
      .sort({ reportDate: -1 })
      .limit(10)
      .lean()
      .exec();

    const recent: SitePhotoItem[] = [];

    for (const d of docs) {
      recent.push({
        id: String(d._id),
        source: 'project_document',
        fileName: d.fileName ?? null,
        reportDate: null,
        href: `${API}/projects/${projectId}/documents?category=photo`,
      });
    }

    for (const dpr of dprs) {
      for (const photoId of dpr.photoDocumentIds ?? []) {
        if (recent.length >= 20) break;
        recent.push({
          id: String(photoId),
          source: 'dpr',
          fileName: null,
          reportDate: dpr.reportDate
            ? new Date(dpr.reportDate).toISOString()
            : null,
          href: `${API}/documents/${String(photoId)}/download-url`,
        });
      }
    }

    return {
      count: recent.length,
      recent: recent.slice(0, 20),
      drillDown: [
        this.link(
          'Project photos',
          `${API}/projects/${projectId}/documents?category=photo`,
        ),
        this.link(
          'Daily progress reports',
          `${API}/daily-progress-reports?projectId=${projectId}`,
        ),
      ],
    };
  }

  private async criticalAlerts(
    projectId: string,
    projectOid: Types.ObjectId,
    vendorDues: MoneyTile,
  ): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = [];

    const stockCount = await this.stockAlertModel
      .countDocuments({
        projectId: projectOid,
        status: StockReorderAlertStatus.Open,
      })
      .exec();
    if (stockCount > 0) {
      alerts.push({
        code: 'MATERIAL_STOCK',
        severity: 'warning',
        message: 'Open material stock reorder alerts',
        count: stockCount,
        drillDown: [
          this.link(
            'Stock reorder alerts',
            `${API}/stock-reorder/alerts?projectId=${projectId}`,
          ),
        ],
      });
    }

    const labourCount = await this.manpowerAlertModel
      .countDocuments({
        projectId: projectOid,
        acknowledged: false,
      })
      .exec();
    if (labourCount > 0) {
      alerts.push({
        code: 'LABOUR_SHORTFALL',
        severity: 'critical',
        message: 'Open manpower shortfall alerts',
        count: labourCount,
        drillDown: [
          this.link(
            'Manpower shortfall alerts',
            `${API}/manpower-planning/shortfall-alerts?projectId=${projectId}`,
          ),
        ],
      });
    }

    const missingDpr = await this.dprMissingModel
      .countDocuments({
        projectId: projectOid,
        acknowledged: false,
      })
      .exec();
    if (missingDpr > 0) {
      alerts.push({
        code: 'MISSING_DPR',
        severity: 'warning',
        message: 'Missing daily progress reports',
        count: missingDpr,
        drillDown: [
          this.link(
            'Missing DPR alerts',
            `${API}/daily-progress-reports/missing-alerts?projectId=${projectId}`,
          ),
        ],
      });
    }

    const matchExceptions = await this.vendorInvoiceModel
      .countDocuments({
        projectId: projectOid,
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        status: { $ne: VendorInvoiceStatus.Cancelled },
      })
      .exec();
    if (matchExceptions > 0) {
      alerts.push({
        code: 'VENDOR_MATCH_EXCEPTION',
        severity: 'critical',
        message: 'Vendor invoices with matching exceptions',
        count: matchExceptions,
        drillDown: [
          this.link(
            'Matching exceptions',
            `${API}/vendor-invoices?projectId=${projectId}&matchingStatus=exception`,
          ),
        ],
      });
    }

    if ((vendorDues.count ?? 0) > 0) {
      alerts.push({
        code: 'VENDOR_DUES',
        severity: 'warning',
        message: 'Outstanding vendor payables',
        count: vendorDues.count ?? 0,
        drillDown: vendorDues.drillDown,
      });
    }

    const pendingPr = await this.purchaseRequestModel
      .countDocuments({
        projectId: projectOid,
        status: {
          $in: [
            PurchaseRequestStatus.Submitted,
            PurchaseRequestStatus.Reviewed,
            PurchaseRequestStatus.Returned,
          ],
        },
      })
      .exec();
    if (pendingPr > 0) {
      alerts.push({
        code: 'PR_PENDING',
        severity: 'warning',
        message: 'Purchase requests awaiting approval',
        count: pendingPr,
        drillDown: [
          this.link(
            'Pending purchase requests',
            `${API}/purchase-requests?projectId=${projectId}&status=submitted`,
          ),
        ],
      });
    }

    return alerts;
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private resolveDates(
    projectId: string,
    query: ProjectDashboardQueryDto,
  ): DateScope {
    const day = query.date ? new Date(query.date) : new Date();
    if (Number.isNaN(day.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    let rangeFrom: Date | null = null;
    let rangeTo: Date | null = null;
    if (query.from) {
      rangeFrom = this.startOfUtcDay(new Date(query.from));
      if (Number.isNaN(rangeFrom.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
    }
    if (query.to) {
      rangeTo = this.endOfUtcDay(new Date(query.to));
      if (Number.isNaN(rangeTo.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
    }
    if (rangeFrom && rangeTo && rangeFrom > rangeTo) {
      throw new BadRequestException('from must be on or before to');
    }

    return {
      projectOid: new Types.ObjectId(projectId),
      projectId,
      dayStart: this.startOfUtcDay(day),
      dayEnd: this.endOfUtcDay(day),
      rangeFrom,
      rangeTo,
    };
  }

  private async sumAccountBalances(
    accounts: Array<{
      _id: Types.ObjectId;
      ledgerAccountId: Types.ObjectId;
      openingBalance: number;
    }>,
    asOf: Date,
  ): Promise<number> {
    if (!accounts.length) return 0;

    const ledgerIds = accounts.map((a) => a.ledgerAccountId);
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: JournalStatus.Posted,
          journalDate: { $lte: asOf },
          'lines.accountId': { $in: ledgerIds },
        },
      },
      { $unwind: '$lines' },
      { $match: { 'lines.accountId': { $in: ledgerIds } } },
      {
        $group: {
          _id: '$lines.accountId',
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ];

    const rows = await this.journalModel.aggregate(pipeline).exec();
    const byLedger = new Map<string, { debit: number; credit: number }>();
    for (const row of rows) {
      byLedger.set(String(row._id), {
        debit: row.totalDebit ?? 0,
        credit: row.totalCredit ?? 0,
      });
    }

    let total = 0;
    for (const a of accounts) {
      const mov = byLedger.get(String(a.ledgerAccountId)) ?? {
        debit: 0,
        credit: 0,
      };
      total += (a.openingBalance ?? 0) + mov.debit - mov.credit;
    }
    return this.round2(total);
  }

  private applyRange(
    match: Record<string, unknown>,
    field: string,
    scope: DateScope,
    defaultToAsOf = false,
  ) {
    if (scope.rangeFrom || scope.rangeTo) {
      const range: Record<string, Date> = {};
      if (scope.rangeFrom) range.$gte = scope.rangeFrom;
      if (scope.rangeTo) range.$lte = scope.rangeTo;
      match[field] = range;
      return;
    }
    if (defaultToAsOf) {
      match[field] = { $lte: scope.dayEnd };
    }
  }

  private moneyTile(
    amount: number,
    count: number | undefined,
    drillDown: DrillDownLink[],
  ): MoneyTile {
    return { amount, count, drillDown };
  }

  private percentTile(
    numerator: number,
    denominator: number,
    drillDown: DrillDownLink[],
  ): PercentTile {
    const n = this.round2(numerator);
    const d = this.round2(denominator);
    return {
      percent: d > 0 ? this.round2((n / d) * 100) : 0,
      numerator: n,
      denominator: d,
      drillDown,
    };
  }

  private link(label: string, href: string): DrillDownLink {
    return { label, href };
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private endOfUtcDay(d: Date): Date {
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

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
