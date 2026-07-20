import {
  BadRequestException,
  ForbiddenException,
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
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import {
  CustomerReceipt,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import { DprMissingAlert } from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  FinancialYear,
} from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import { ManpowerShortfallAlert } from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
} from '../payment-schedules/schemas/payment-schedule.schema';
import {
  CommitmentStatus,
  ContributionCommitment,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import { Project } from '../projects/schemas/project.schema';
import {
  PurchaseRequest,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
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
import type { CommandCentreQueryDto } from './dto/command-centre-query.dto';
import type {
  AlertSummary,
  BoqUtilisationRow,
  CommandCentreFiltersApplied,
  ContractorPerformanceRow,
  ContributionSummary,
  CostVersusBudgetRow,
  CriticalException,
  DirectorCommandCentreSummary,
  DrillDownLink,
  MoneyTile,
  ProgressRow,
  ProjectMoneyRow,
} from './director-command-centre.types';

const API = '/api/v1';

type ProjectMeta = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
};

type ResolvedScope = {
  projectIds: Types.ObjectId[];
  projectMeta: Map<string, ProjectMeta>;
  dayStart: Date;
  dayEnd: Date;
  rangeFrom: Date | null;
  rangeTo: Date | null;
  filters: CommandCentreFiltersApplied;
};

@Injectable()
export class DirectorCommandCentreService {
  constructor(
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(CustomerReceipt.name)
    private readonly customerReceiptModel: Model<CustomerReceipt>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(PaymentSchedule.name)
    private readonly paymentScheduleModel: Model<PaymentSchedule>,
    @InjectModel(PurchaseRequest.name)
    private readonly purchaseRequestModel: Model<PurchaseRequest>,
    @InjectModel(BoqVersion.name)
    private readonly boqVersionModel: Model<BoqVersion>,
    @InjectModel(WorkMeasurement.name)
    private readonly workMeasurementModel: Model<WorkMeasurement>,
    @InjectModel(StockReorderAlert.name)
    private readonly stockAlertModel: Model<StockReorderAlert>,
    @InjectModel(ManpowerShortfallAlert.name)
    private readonly manpowerAlertModel: Model<ManpowerShortfallAlert>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(DprMissingAlert.name)
    private readonly dprMissingModel: Model<DprMissingAlert>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(FinancialYear.name)
    private readonly financialYearModel: Model<FinancialYear>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getSummary(query: CommandCentreQueryDto, actorId: string) {
    const scope = await this.resolveScope(query, actorId);
    const projectOidFilter = scope.projectIds.length
      ? { $in: scope.projectIds }
      : { $in: [] as Types.ObjectId[] };

    const [
      bankTiles,
      cashTiles,
      directorContribution,
      investorContribution,
      customerCollections,
      vendorPayable,
      contractorPayable,
      paymentsDueToday,
      overduePayments,
      purchaseRequestsPending,
      costVersusBudget,
      physicalProgress,
      boqUtilisation,
      materialStockAlerts,
      labourShortfall,
      contractorPerformance,
    ] = await Promise.all([
      this.buildBankBalances(scope),
      this.buildCashBalances(scope),
      this.buildContributionSummary(
        scope,
        ParticipantType.Director,
        `${API}/projects/{projectId}/commitments`,
      ),
      this.buildContributionSummary(
        scope,
        ParticipantType.OutsideInvestor,
        `${API}/projects/{projectId}/commitments`,
      ),
      this.sumCustomerCollections(scope, projectOidFilter),
      this.sumVendorPayable(scope, projectOidFilter),
      this.sumContractorPayable(scope, projectOidFilter),
      this.sumPaymentsDueToday(scope, projectOidFilter),
      this.sumOverduePayments(scope, projectOidFilter),
      this.countPendingPurchaseRequests(scope, projectOidFilter),
      this.buildCostVersusBudget(scope, projectOidFilter),
      this.buildPhysicalProgress(scope, projectOidFilter),
      this.buildBoqUtilisation(scope, projectOidFilter),
      this.buildStockAlerts(scope, projectOidFilter),
      this.buildLabourShortfall(scope, projectOidFilter),
      this.buildContractorPerformance(projectOidFilter),
    ]);

    const criticalExceptions = await this.buildCriticalExceptions({
      scope,
      projectOidFilter,
      overduePayments,
      materialStockAlerts,
      labourShortfall,
      vendorPayable,
      purchaseRequestsPending,
    });

    const summary: DirectorCommandCentreSummary = {
      filters: scope.filters,
      totalCompanyBankBalance: bankTiles.total,
      totalCashBalance: cashTiles.total,
      projectWiseBankBalance: bankTiles.byProject,
      projectWisePettyCash: cashTiles.pettyByProject,
      directorContributionSummary: directorContribution,
      investorContributionSummary: investorContribution,
      customerCollections,
      vendorPayable,
      contractorPayable,
      paymentsDueToday,
      overduePayments,
      purchaseRequestsPending,
      costVersusBudget,
      physicalProgress,
      boqUtilisation,
      materialStockAlerts,
      labourShortfall,
      contractorPerformance,
      criticalExceptions,
    };

    return createSuccessResponse(
      summary,
      'Director command centre summary',
    );
  }

  // ─── scope / filters ───────────────────────────────────────────────────

  private async resolveScope(
    query: CommandCentreQueryDto,
    actorId: string,
  ): Promise<ResolvedScope> {
    const access = await this.projectAccessService.listAccessibleProjectIds(
      actorId,
    );

    let projectIds: Types.ObjectId[] = [];
    if (access.globalAccess) {
      const all = await this.projectModel.find({}).select('_id').lean().exec();
      projectIds = all.map((p) => p._id as Types.ObjectId);
    } else {
      projectIds = access.projectIds
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
    }

    if (query.projectId) {
      if (!Types.ObjectId.isValid(query.projectId)) {
        throw new BadRequestException('Invalid projectId');
      }
      const requested = new Types.ObjectId(query.projectId);
      if (
        !access.globalAccess &&
        !projectIds.some((id) => id.equals(requested))
      ) {
        throw new ForbiddenException('Project is not accessible');
      }
      projectIds = [requested];
    }

    if (query.directorId) {
      if (!Types.ObjectId.isValid(query.directorId)) {
        throw new BadRequestException('Invalid directorId');
      }
      const directorOid = new Types.ObjectId(query.directorId);
      const directorProjects = await this.participantModel
        .find({
          participantType: ParticipantType.Director,
          participantId: directorOid,
          status: ParticipantApprovalStatus.Approved,
          effectiveTo: null,
          ...(projectIds.length ? { projectId: { $in: projectIds } } : {}),
        })
        .select('projectId')
        .lean()
        .exec();
      const allowed = new Set(
        directorProjects.map((p) => String(p.projectId)),
      );
      projectIds = projectIds.filter((id) => allowed.has(String(id)));
    }

    const day = query.date ? new Date(query.date) : new Date();
    if (Number.isNaN(day.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const dayStart = this.startOfUtcDay(day);
    const dayEnd = this.endOfUtcDay(day);

    let rangeFrom: Date | null = null;
    let rangeTo: Date | null = null;
    let financialYearName: string | null = null;

    if (query.financialYearId) {
      if (!Types.ObjectId.isValid(query.financialYearId)) {
        throw new BadRequestException('Invalid financialYearId');
      }
      const fy = await this.financialYearModel
        .findById(query.financialYearId)
        .lean()
        .exec();
      if (!fy) {
        throw new NotFoundException('Financial year not found');
      }
      rangeFrom = new Date(fy.startDate);
      rangeTo = new Date(fy.endDate);
      financialYearName = fy.name;
    }

    const projects = projectIds.length
      ? await this.projectModel
          .find({ _id: { $in: projectIds } })
          .select('_id projectCode projectName')
          .lean()
          .exec()
      : [];

    const projectMeta = new Map<string, ProjectMeta>();
    for (const p of projects) {
      projectMeta.set(String(p._id), {
        projectId: String(p._id),
        projectCode: p.projectCode ?? null,
        projectName: p.projectName ?? null,
      });
    }

    return {
      projectIds,
      projectMeta,
      dayStart,
      dayEnd,
      rangeFrom,
      rangeTo,
      filters: {
        date: dayStart.toISOString(),
        projectId: query.projectId ?? null,
        directorId: query.directorId ?? null,
        financialYearId: query.financialYearId ?? null,
        financialYearName,
        rangeFrom: rangeFrom?.toISOString() ?? null,
        rangeTo: rangeTo?.toISOString() ?? null,
        accessibleProjectCount: projectIds.length,
      },
    };
  }

  // ─── bank / cash ───────────────────────────────────────────────────────

  private async buildBankBalances(scope: ResolvedScope) {
    const filter: FilterQuery<CompanyBankAccount> = {
      status: BankAccountStatus.Active,
    };
    if (scope.projectIds.length) {
      filter.$or = [
        { projectId: { $in: scope.projectIds } },
        { projectId: null },
      ];
    } else if (scope.filters.projectId || scope.filters.directorId) {
      // Scoped empty — no balances
      return {
        total: this.moneyTile(0, 0, [
          this.link('Company bank accounts', `${API}/company-bank-accounts`),
        ]),
        byProject: [] as ProjectMoneyRow[],
      };
    }

    const accounts = await this.bankModel
      .find(filter)
      .select('_id accountCode projectId ledgerAccountId openingBalance')
      .lean()
      .exec();

    const balances = await this.balancesForAccounts(
      accounts.map((a) => ({
        id: String(a._id),
        ledgerAccountId: a.ledgerAccountId as Types.ObjectId,
        openingBalance: a.openingBalance ?? 0,
        projectId: a.projectId ? String(a.projectId) : null,
      })),
      scope,
    );

    let totalAmount = 0;
    const byProjectMap = new Map<string, number>();
    for (const a of accounts) {
      const bal = balances.get(String(a._id)) ?? a.openingBalance ?? 0;
      totalAmount += bal;
      if (a.projectId) {
        const key = String(a.projectId);
        byProjectMap.set(key, (byProjectMap.get(key) ?? 0) + bal);
      }
    }

    const byProject = this.toProjectMoneyRows(
      byProjectMap,
      scope,
      (projectId) => [
        this.link(
          'Project bank accounts',
          `${API}/company-bank-accounts?projectId=${projectId}`,
        ),
      ],
    );

    return {
      total: this.moneyTile(this.round2(totalAmount), accounts.length, [
        this.link('Company bank accounts', `${API}/company-bank-accounts`),
      ]),
      byProject,
    };
  }

  private async buildCashBalances(scope: ResolvedScope) {
    const filter: FilterQuery<CashAccount> = {
      status: { $ne: CashAccountStatus.Closed },
    };
    if (scope.projectIds.length) {
      filter.projectId = { $in: scope.projectIds };
    } else if (scope.filters.projectId || scope.filters.directorId) {
      return {
        total: this.moneyTile(0, 0, [
          this.link('Cash accounts', `${API}/cash-accounts`),
        ]),
        pettyByProject: [] as ProjectMoneyRow[],
      };
    }

    const accounts = await this.cashModel
      .find(filter)
      .select('_id accountCode kind projectId ledgerAccountId openingBalance')
      .lean()
      .exec();

    const balances = await this.balancesForAccounts(
      accounts.map((a) => ({
        id: String(a._id),
        ledgerAccountId: a.ledgerAccountId as Types.ObjectId,
        openingBalance: a.openingBalance ?? 0,
        projectId: String(a.projectId),
      })),
      scope,
    );

    let totalAmount = 0;
    const pettyByProject = new Map<string, number>();
    for (const a of accounts) {
      const bal = balances.get(String(a._id)) ?? a.openingBalance ?? 0;
      totalAmount += bal;
      if (a.kind === CashAccountKind.PettyCash) {
        const key = String(a.projectId);
        pettyByProject.set(key, (pettyByProject.get(key) ?? 0) + bal);
      }
    }

    return {
      total: this.moneyTile(this.round2(totalAmount), accounts.length, [
        this.link('Cash accounts', `${API}/cash-accounts`),
      ]),
      pettyByProject: this.toProjectMoneyRows(
        pettyByProject,
        scope,
        (projectId) => [
          this.link(
            'Project petty cash',
            `${API}/cash-accounts?projectId=${projectId}&kind=petty_cash`,
          ),
        ],
      ),
    };
  }

  private async balancesForAccounts(
    accounts: Array<{
      id: string;
      ledgerAccountId: Types.ObjectId;
      openingBalance: number;
      projectId: string | null;
    }>,
    scope: ResolvedScope,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (!accounts.length) return result;

    const ledgerIds = accounts.map((a) => a.ledgerAccountId);
    // Balances are always as-of reporting date (opening + posted movements ≤ dayEnd).
    // Financial-year filter applies to transactional tiles, not cash position.
    const match: FilterQuery<JournalEntry> = {
      status: JournalStatus.Posted,
      'lines.accountId': { $in: ledgerIds },
      journalDate: { $lte: scope.dayEnd },
    };

    const pipeline: PipelineStage[] = [
      { $match: match },
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

    for (const a of accounts) {
      const mov = byLedger.get(String(a.ledgerAccountId)) ?? {
        debit: 0,
        credit: 0,
      };
      result.set(
        a.id,
        this.round2((a.openingBalance ?? 0) + mov.debit - mov.credit),
      );
    }
    return result;
  }

  // ─── contributions ─────────────────────────────────────────────────────

  private async buildContributionSummary(
    scope: ResolvedScope,
    participantType: ParticipantType.Director | ParticipantType.OutsideInvestor,
    drillHrefTemplate: string,
  ): Promise<ContributionSummary> {
    const typeLabel =
      participantType === ParticipantType.Director
        ? 'director'
        : 'outside_investor';

    if (!scope.projectIds.length) {
      return {
        participantType: typeLabel,
        committedAmount: 0,
        receivedAmount: 0,
        pendingAmount: 0,
        participantCount: 0,
        commitmentCount: 0,
        drillDown: [
          this.link(
            'Project participants',
            `${API}/projects?include=participants`,
          ),
        ],
      };
    }

    const participantFilter: FilterQuery<ProjectParticipant> = {
      projectId: { $in: scope.projectIds },
      participantType,
      status: ParticipantApprovalStatus.Approved,
      effectiveTo: null,
    };
    if (
      scope.filters.directorId &&
      participantType === ParticipantType.Director
    ) {
      participantFilter.participantId = new Types.ObjectId(
        scope.filters.directorId,
      );
    }

    const participants = await this.participantModel
      .find(participantFilter)
      .select('_id')
      .lean()
      .exec();
    const participantOids = participants.map((p) => p._id as Types.ObjectId);

    if (!participantOids.length) {
      return {
        participantType: typeLabel,
        committedAmount: 0,
        receivedAmount: 0,
        pendingAmount: 0,
        participantCount: 0,
        commitmentCount: 0,
        drillDown: [
          this.link(
            `${typeLabel} commitments`,
            drillHrefTemplate.replace('{projectId}', String(scope.projectIds[0])),
          ),
        ],
      };
    }

    const commitmentFilter: FilterQuery<ContributionCommitment> = {
      projectId: { $in: scope.projectIds },
      participantId: { $in: participantOids },
      status: CommitmentStatus.Approved,
    };
    if (scope.rangeFrom || scope.rangeTo) {
      commitmentFilter.commitmentDate = {};
      if (scope.rangeFrom) {
        (commitmentFilter.commitmentDate as Record<string, Date>).$gte =
          scope.rangeFrom;
      }
      if (scope.rangeTo) {
        (commitmentFilter.commitmentDate as Record<string, Date>).$lte =
          scope.rangeTo;
      }
    }

    const approved = await this.commitmentModel
      .find(commitmentFilter)
      .select('commitmentAmount receivedAmount')
      .lean()
      .exec();

    const committed = approved.reduce((s, r) => s + (r.commitmentAmount ?? 0), 0);
    const received = approved.reduce((s, r) => s + (r.receivedAmount ?? 0), 0);

    const primaryProject = String(scope.projectIds[0]);
    return {
      participantType: typeLabel,
      committedAmount: this.round2(committed),
      receivedAmount: this.round2(received),
      pendingAmount: this.round2(Math.max(0, committed - received)),
      participantCount: participantOids.length,
      commitmentCount: approved.length,
      drillDown: [
        this.link(
          `${typeLabel} commitments`,
          drillHrefTemplate.replace('{projectId}', primaryProject),
        ),
        this.link(
          'Contribution receipts',
          `${API}/projects/${primaryProject}/contribution-receipts`,
        ),
      ],
    };
  }

  // ─── collections / payables ────────────────────────────────────────────

  private async sumCustomerCollections(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const match: FilterQuery<CustomerReceipt> = {
      status: CustomerReceiptStatus.Posted,
      projectId: projectOidFilter,
    };
    this.applyDateRange(match, 'receiptDate', scope);

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

    const qs = this.projectQuery(scope);
    return this.moneyTile(this.round2(agg?.total ?? 0), agg?.count ?? 0, [
      this.link(
        'Customer receipts',
        `${API}/customer-receipts${qs}`,
      ),
    ]);
  }

  private async sumVendorPayable(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const match: FilterQuery<VendorInvoice> = {
      projectId: projectOidFilter,
      status: {
        $in: [
          VendorInvoiceStatus.Posted,
          VendorInvoiceStatus.Approval,
          VendorInvoiceStatus.Matching,
          VendorInvoiceStatus.Verification,
          VendorInvoiceStatus.Submitted,
        ],
      },
    };

    const rows = await this.vendorInvoiceModel
      .find(match)
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let total = 0;
    let count = 0;
    for (const r of rows) {
      const remaining = this.round2(
        (r.totalAmount ?? 0) -
          (r.tds ?? 0) -
          (r.retention ?? 0) -
          (r.paidAmount ?? 0),
      );
      if (remaining > 0) {
        total += remaining;
        count += 1;
      }
    }

    const qs = this.projectQuery(scope);
    return this.moneyTile(this.round2(total), count, [
      this.link('Vendor invoices', `${API}/vendor-invoices${qs}`),
      this.link('Vendor payments', `${API}/vendor-payments${qs}`),
    ]);
  }

  private async sumContractorPayable(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const match: FilterQuery<ContractorBill> = {
      projectId: projectOidFilter,
      status: {
        $in: [
          ContractorBillStatus.Posted,
          ContractorBillStatus.DirectorApproved,
          ContractorBillStatus.FinanceVerified,
          ContractorBillStatus.PmCertified,
        ],
      },
    };

    const rows = await this.contractorBillModel
      .find(match)
      .select('netPayable paidAmount')
      .lean()
      .exec();

    let total = 0;
    let count = 0;
    for (const r of rows) {
      const remaining = this.round2((r.netPayable ?? 0) - (r.paidAmount ?? 0));
      if (remaining > 0) {
        total += remaining;
        count += 1;
      }
    }

    const qs = this.projectQuery(scope);
    return this.moneyTile(this.round2(total), count, [
      this.link('Contractor bills', `${API}/contractor-bills${qs}`),
      this.link('Contractor payments', `${API}/contractor-payments${qs}`),
    ]);
  }

  private async sumPaymentsDueToday(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const vendorDue = await this.vendorInvoiceModel
      .find({
        projectId: projectOidFilter,
        dueDate: { $gte: scope.dayStart, $lte: scope.dayEnd },
        status: { $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled] },
      })
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let amount = 0;
    let count = 0;
    for (const r of vendorDue) {
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

    const scheduleAgg = await this.paymentScheduleModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectOidFilter,
            status: PaymentScheduleStatus.Active,
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.dueDate': { $gte: scope.dayStart, $lte: scope.dayEnd },
            'lines.status': {
              $in: [
                PaymentScheduleLineStatus.Pending,
                PaymentScheduleLineStatus.Due,
                PaymentScheduleLineStatus.Demanded,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: [
                  { $add: ['$lines.amount', '$lines.tax'] },
                  '$lines.collectedAmount',
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    amount += scheduleAgg[0]?.total ?? 0;
    count += scheduleAgg[0]?.count ?? 0;

    const qs = this.projectQuery(scope);
    const dateQs = `date=${scope.dayStart.toISOString().slice(0, 10)}`;
    return this.moneyTile(this.round2(Math.max(0, amount)), count, [
      this.link(
        'Vendor invoices due',
        `${API}/vendor-invoices${qs}${qs ? '&' : '?'}${dateQs}`,
      ),
      this.link(
        'Customer demands due',
        `${API}/payment-schedules/overdue${qs}`,
      ),
    ]);
  }

  private async sumOverduePayments(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const vendorOverdue = await this.vendorInvoiceModel
      .find({
        projectId: projectOidFilter,
        dueDate: { $lt: scope.dayStart },
        status: { $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled] },
      })
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let amount = 0;
    let count = 0;
    for (const r of vendorOverdue) {
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

    const scheduleAgg = await this.paymentScheduleModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectOidFilter,
            status: PaymentScheduleStatus.Active,
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.status': PaymentScheduleLineStatus.Overdue,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: [
                  { $add: ['$lines.amount', '$lines.tax'] },
                  '$lines.collectedAmount',
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    amount += Math.max(0, scheduleAgg[0]?.total ?? 0);
    count += scheduleAgg[0]?.count ?? 0;

    const qs = this.projectQuery(scope);
    return this.moneyTile(this.round2(amount), count, [
      this.link('Overdue vendor invoices', `${API}/vendor-invoices${qs}`),
      this.link(
        'Overdue customer schedules',
        `${API}/payment-schedules/overdue${qs}`,
      ),
    ]);
  }

  private async countPendingPurchaseRequests(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const match: FilterQuery<PurchaseRequest> = {
      projectId: projectOidFilter,
      status: {
        $in: [
          PurchaseRequestStatus.Submitted,
          PurchaseRequestStatus.Reviewed,
          PurchaseRequestStatus.Returned,
        ],
      },
    };

    const count = await this.purchaseRequestModel.countDocuments(match).exec();
    const qs = this.projectQuery(scope);
    return this.moneyTile(0, count, [
      this.link(
        'Pending purchase requests',
        `${API}/purchase-requests?status=submitted${qs ? '&' + qs.slice(1) : ''}`,
      ),
    ]);
  }

  // ─── progress / BOQ / cost ─────────────────────────────────────────────

  private async buildCostVersusBudget(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<CostVersusBudgetRow[]> {
    if (!scope.projectIds.length) return [];

    const budgets = await this.boqVersionModel
      .find({
        projectId: projectOidFilter,
        status: BoqVersionStatus.Active,
      })
      .select('projectId totalPlannedValue')
      .lean()
      .exec();

    const budgetByProject = new Map<string, number>();
    for (const b of budgets) {
      budgetByProject.set(String(b.projectId), b.totalPlannedValue ?? 0);
    }

    const vendorCosts = await this.vendorInvoiceModel
      .aggregate<{ _id: Types.ObjectId; total: number }>([
        {
          $match: {
            projectId: projectOidFilter,
            status: {
              $in: [VendorInvoiceStatus.Posted, VendorInvoiceStatus.Paid],
            },
          },
        },
        { $group: { _id: '$projectId', total: { $sum: '$totalAmount' } } },
      ])
      .exec();

    const contractorCosts = await this.contractorBillModel
      .aggregate<{ _id: Types.ObjectId; total: number }>([
        {
          $match: {
            projectId: projectOidFilter,
            status: {
              $in: [ContractorBillStatus.Posted, ContractorBillStatus.Paid],
            },
          },
        },
        {
          $group: {
            _id: '$projectId',
            total: { $sum: '$currentCertifiedValue' },
          },
        },
      ])
      .exec();

    const costByProject = new Map<string, number>();
    for (const r of vendorCosts) {
      costByProject.set(String(r._id), r.total ?? 0);
    }
    for (const r of contractorCosts) {
      const key = String(r._id);
      costByProject.set(key, (costByProject.get(key) ?? 0) + (r.total ?? 0));
    }

    const projectKeys = new Set([
      ...budgetByProject.keys(),
      ...costByProject.keys(),
    ]);

    return [...projectKeys].map((projectId) => {
      const meta = scope.projectMeta.get(projectId);
      const budgetAmount = this.round2(budgetByProject.get(projectId) ?? 0);
      const actualCost = this.round2(costByProject.get(projectId) ?? 0);
      const variance = this.round2(budgetAmount - actualCost);
      const utilisationPercent =
        budgetAmount > 0
          ? this.round2((actualCost / budgetAmount) * 100)
          : 0;
      return {
        projectId,
        projectCode: meta?.projectCode ?? null,
        projectName: meta?.projectName ?? null,
        budgetAmount,
        actualCost,
        variance,
        utilisationPercent,
        drillDown: [
          this.link(
            'Active BOQ',
            `${API}/boq/projects/${projectId}/versions/active`,
          ),
          this.link(
            'Vendor invoices',
            `${API}/vendor-invoices?projectId=${projectId}`,
          ),
          this.link(
            'Contractor bills',
            `${API}/contractor-bills?projectId=${projectId}`,
          ),
        ],
      };
    });
  }

  private async buildPhysicalProgress(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<ProgressRow[]> {
    if (!scope.projectIds.length) return [];

    const rows = await this.workMeasurementModel
      .aggregate<{
        _id: Types.ObjectId;
        planned: number;
        measured: number;
      }>([
        {
          $match: {
            projectId: projectOidFilter,
            status: WorkMeasurementStatus.Verified,
          },
        },
        {
          $group: {
            _id: {
              projectId: '$projectId',
              boqItemId: '$boqItemId',
            },
            planned: { $max: '$boqPlannedQuantity' },
            measured: { $max: '$cumulativeQuantity' },
          },
        },
        {
          $group: {
            _id: '$_id.projectId',
            planned: { $sum: '$planned' },
            measured: { $sum: '$measured' },
          },
        },
      ])
      .exec();

    return rows.map((r) => {
      const projectId = String(r._id);
      const meta = scope.projectMeta.get(projectId);
      const plannedQuantity = this.round2(r.planned ?? 0);
      const measuredQuantity = this.round2(r.measured ?? 0);
      const progressPercent =
        plannedQuantity > 0
          ? this.round2((measuredQuantity / plannedQuantity) * 100)
          : 0;
      return {
        projectId,
        projectCode: meta?.projectCode ?? null,
        projectName: meta?.projectName ?? null,
        plannedQuantity,
        measuredQuantity,
        progressPercent,
        drillDown: [
          this.link(
            'Work measurements',
            `${API}/work-measurements?projectId=${projectId}`,
          ),
          this.link(
            'Daily progress reports',
            `${API}/daily-progress-reports?projectId=${projectId}`,
          ),
        ],
      };
    });
  }

  private async buildBoqUtilisation(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<BoqUtilisationRow[]> {
    const progress = await this.buildPhysicalProgress(scope, projectOidFilter);
    const budgets = await this.boqVersionModel
      .find({
        projectId: projectOidFilter,
        status: BoqVersionStatus.Active,
      })
      .select('projectId totalPlannedValue')
      .lean()
      .exec();
    const budgetMap = new Map(
      budgets.map((b) => [String(b.projectId), b.totalPlannedValue ?? 0]),
    );

    return progress.map((p) => ({
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      boqPlannedValue: this.round2(budgetMap.get(p.projectId) ?? 0),
      utilisedQuantityPercent: p.progressPercent,
      drillDown: [
        this.link(
          'BOQ versions',
          `${API}/boq/projects/${p.projectId}/versions`,
        ),
        ...p.drillDown,
      ],
    }));
  }

  // ─── alerts / performance / exceptions ─────────────────────────────────

  private async buildStockAlerts(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<AlertSummary> {
    const items = await this.stockAlertModel
      .find({
        projectId: projectOidFilter,
        status: StockReorderAlertStatus.Open,
      })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
      .exec();

    const qs = this.projectQuery(scope);
    return {
      count: items.length,
      items: items.map((a) => ({
        id: String(a._id),
        projectId: String(a.projectId),
        message: `${a.materialName ?? a.materialCode ?? 'Material'}: ${a.alertType}`,
        type: a.alertType,
        severity: 'warning',
      })),
      drillDown: [
        this.link('Stock reorder alerts', `${API}/stock-reorder/alerts${qs}`),
      ],
    };
  }

  private async buildLabourShortfall(
    scope: ResolvedScope,
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<AlertSummary> {
    const items = await this.manpowerAlertModel
      .find({
        projectId: projectOidFilter,
        acknowledged: false,
      })
      .sort({ asOfDate: -1 })
      .limit(25)
      .lean()
      .exec();

    const qs = this.projectQuery(scope);
    return {
      count: items.length,
      items: items.map((a) => ({
        id: String(a._id),
        projectId: String(a.projectId),
        message: a.message,
        type: a.alertType,
        severity:
          a.recommendedEscalation === 'director' ? 'critical' : 'warning',
      })),
      drillDown: [
        this.link(
          'Manpower shortfall alerts',
          `${API}/manpower-planning/shortfall-alerts${qs}`,
        ),
      ],
    };
  }

  private async buildContractorPerformance(
    projectOidFilter: { $in: Types.ObjectId[] },
  ): Promise<ContractorPerformanceRow[]> {
    const payables = await this.contractorBillModel
      .aggregate<{
        _id: Types.ObjectId;
        payable: number;
      }>([
        {
          $match: {
            projectId: projectOidFilter,
            status: {
              $in: [
                ContractorBillStatus.Posted,
                ContractorBillStatus.DirectorApproved,
              ],
            },
          },
        },
        {
          $project: {
            contractorId: 1,
            remaining: {
              $subtract: ['$netPayable', '$paidAmount'],
            },
          },
        },
        { $match: { remaining: { $gt: 0 } } },
        {
          $group: {
            _id: '$contractorId',
            payable: { $sum: '$remaining' },
          },
        },
      ])
      .exec();

    const payableMap = new Map(
      payables.map((p) => [String(p._id), this.round2(p.payable ?? 0)]),
    );

    const contractors = await this.contractorModel
      .find({
        status: { $ne: ContractorStatus.Blocked },
        rating: { $ne: null },
      })
      .select('_id tradeName rating')
      .sort({ rating: 1 })
      .limit(20)
      .lean()
      .exec();

    // Prefer contractors with open payable on scoped projects; fill with rated list.
    const ids = new Set([
      ...payableMap.keys(),
      ...contractors.map((c) => String(c._id)),
    ]);
    const docs = await this.contractorModel
      .find({ _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } })
      .select('_id tradeName rating')
      .lean()
      .exec();

    return docs
      .map((c) => ({
        contractorId: String(c._id),
        tradeName: c.tradeName ?? null,
        rating: c.rating ?? null,
        openBillPayable: payableMap.get(String(c._id)) ?? 0,
        drillDown: [
          this.link(
            'Contractor performance',
            `${API}/contractors/${String(c._id)}/performance`,
          ),
        ],
      }))
      .sort((a, b) => (a.rating ?? 99) - (b.rating ?? 99))
      .slice(0, 20);
  }

  private async buildCriticalExceptions(input: {
    scope: ResolvedScope;
    projectOidFilter: { $in: Types.ObjectId[] };
    overduePayments: MoneyTile;
    materialStockAlerts: AlertSummary;
    labourShortfall: AlertSummary;
    vendorPayable: MoneyTile;
    purchaseRequestsPending: MoneyTile;
  }): Promise<CriticalException[]> {
    const { scope, projectOidFilter } = input;
    const exceptions: CriticalException[] = [];

    if ((input.overduePayments.count ?? 0) > 0) {
      exceptions.push({
        code: 'OVERDUE_PAYMENTS',
        severity: 'critical',
        message: 'Overdue vendor or customer schedule payments',
        count: input.overduePayments.count ?? 0,
        drillDown: input.overduePayments.drillDown,
      });
    }

    const matchingExceptions = await this.vendorInvoiceModel
      .countDocuments({
        projectId: projectOidFilter,
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        status: { $ne: VendorInvoiceStatus.Cancelled },
      })
      .exec();
    if (matchingExceptions > 0) {
      exceptions.push({
        code: 'VENDOR_MATCH_EXCEPTION',
        severity: 'critical',
        message: 'Vendor invoices with matching exceptions',
        count: matchingExceptions,
        drillDown: [
          this.link(
            'Matching exceptions',
            `${API}/vendor-invoices?matchingStatus=exception${this.projectQuery(scope).replace('?', '&')}`,
          ),
        ],
      });
    }

    const directorLabour = input.labourShortfall.items.filter(
      (i) => i.severity === 'critical',
    ).length;
    if (directorLabour > 0 || input.labourShortfall.count > 0) {
      exceptions.push({
        code: 'LABOUR_SHORTFALL',
        severity: directorLabour > 0 ? 'critical' : 'warning',
        message: 'Open manpower shortfall alerts',
        count: input.labourShortfall.count,
        drillDown: input.labourShortfall.drillDown,
      });
    }

    if (input.materialStockAlerts.count > 0) {
      exceptions.push({
        code: 'MATERIAL_STOCK',
        severity: 'warning',
        message: 'Open material stock reorder alerts',
        count: input.materialStockAlerts.count,
        drillDown: input.materialStockAlerts.drillDown,
      });
    }

    const missingDpr = await this.dprMissingModel
      .countDocuments({
        projectId: projectOidFilter,
        acknowledged: false,
      })
      .exec();
    if (missingDpr > 0) {
      exceptions.push({
        code: 'MISSING_DPR',
        severity: 'warning',
        message: 'Missing daily progress reports',
        count: missingDpr,
        drillDown: [
          this.link(
            'Missing DPR alerts',
            `${API}/daily-progress-reports/missing-alerts${this.projectQuery(scope)}`,
          ),
        ],
      });
    }

    if ((input.purchaseRequestsPending.count ?? 0) > 0) {
      exceptions.push({
        code: 'PR_PENDING',
        severity: 'warning',
        message: 'Purchase requests awaiting approval',
        count: input.purchaseRequestsPending.count ?? 0,
        drillDown: input.purchaseRequestsPending.drillDown,
      });
    }

    return exceptions;
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private moneyTile(
    amount: number,
    count: number | undefined,
    drillDown: DrillDownLink[],
  ): MoneyTile {
    return { amount, count, drillDown };
  }

  private link(label: string, href: string): DrillDownLink {
    return { label, href };
  }

  private projectQuery(scope: ResolvedScope): string {
    if (scope.filters.projectId) {
      return `?projectId=${scope.filters.projectId}`;
    }
    if (scope.projectIds.length === 1) {
      return `?projectId=${String(scope.projectIds[0])}`;
    }
    return '';
  }

  private toProjectMoneyRows(
    amounts: Map<string, number>,
    scope: ResolvedScope,
    drillDownFn: (projectId: string) => DrillDownLink[],
  ): ProjectMoneyRow[] {
    return [...amounts.entries()]
      .map(([projectId, amount]) => {
        const meta = scope.projectMeta.get(projectId);
        return {
          projectId,
          projectCode: meta?.projectCode ?? null,
          projectName: meta?.projectName ?? null,
          amount: this.round2(amount),
          drillDown: drillDownFn(projectId),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }

  private applyDateRange(
    match: Record<string, unknown>,
    field: string,
    scope: ResolvedScope,
  ) {
    if (scope.rangeFrom || scope.rangeTo) {
      const range: Record<string, Date> = {};
      if (scope.rangeFrom) range.$gte = scope.rangeFrom;
      if (scope.rangeTo) range.$lte = scope.rangeTo;
      match[field] = range;
      return;
    }
    match[field] = { $lte: scope.dayEnd };
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
