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
  BankReconciliationSessionStatus,
  BankStatementLineStatus,
} from '../bank-reconciliation/bank-reconciliation.constants';
import { BankReconciliationSession } from '../bank-reconciliation/schemas/bank-reconciliation-session.schema';
import { BankStatementLine } from '../bank-reconciliation/schemas/bank-statement-line.schema';
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
  ContractorPayment,
  ContractorPaymentStatus,
} from '../contractor-payments/schemas/contractor-payment.schema';
import { FinancialYear } from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  PaymentDemand,
  PaymentDemandStatus,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
} from '../payment-schedules/schemas/payment-schedule.schema';
import {
  PettyCashRequirement,
  PettyCashRequirementStatus,
} from '../petty-cash-requirements/schemas/petty-cash-requirement.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import {
  CommitmentStatus,
  ContributionCommitment,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
} from '../project-participants/schemas/project-participant.schema';
import { Project } from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentStatus,
} from '../vendor-payments/schemas/vendor-payment.schema';
import type { FinanceDashboardQueryDto } from './dto/finance-dashboard-query.dto';
import type {
  AgeingBuckets,
  BankReconciliationPending,
  CashFlowForecast,
  CashFlowPeriod,
  ContributionPending,
  DrillDownLink,
  FinanceDashboardSummary,
  MoneyTile,
  ProjectFundRow,
} from './finance-dashboard.types';

const API = '/api/v1';

type ProjectMeta = {
  projectId: string;
  projectCode: string | null;
  projectName: string | null;
};

type Scope = {
  projectIds: Types.ObjectId[];
  projectMeta: Map<string, ProjectMeta>;
  dayStart: Date;
  dayEnd: Date;
  rangeFrom: Date | null;
  rangeTo: Date | null;
  horizonDays: number;
  horizonEnd: Date;
  filters: FinanceDashboardSummary['filters'];
};

@Injectable()
export class FinanceDashboardService {
  constructor(
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(CashAccount.name)
    private readonly cashModel: Model<CashAccount>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(PaymentSchedule.name)
    private readonly paymentScheduleModel: Model<PaymentSchedule>,
    @InjectModel(PaymentDemand.name)
    private readonly paymentDemandModel: Model<PaymentDemand>,
    @InjectModel(ContributionCommitment.name)
    private readonly commitmentModel: Model<ContributionCommitment>,
    @InjectModel(ProjectParticipant.name)
    private readonly participantModel: Model<ProjectParticipant>,
    @InjectModel(VendorPayment.name)
    private readonly vendorPaymentModel: Model<VendorPayment>,
    @InjectModel(ContractorPayment.name)
    private readonly contractorPaymentModel: Model<ContractorPayment>,
    @InjectModel(PettyCashRequirement.name)
    private readonly pettyCashRequirementModel: Model<PettyCashRequirement>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(FinancialYear.name)
    private readonly financialYearModel: Model<FinancialYear>,
    @InjectModel(BankReconciliationSession.name)
    private readonly bankReconSessionModel: Model<BankReconciliationSession>,
    @InjectModel(BankStatementLine.name)
    private readonly bankStatementLineModel: Model<BankStatementLine>,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getSummary(query: FinanceDashboardQueryDto, actorId: string) {
    const scope = await this.resolveScope(query, actorId);
    const projectFilter = { $in: scope.projectIds };

    const [
      companyBankBalances,
      cashBalances,
      projectFundPosition,
      vendorAgeing,
      contractorAgeing,
      customerReceivables,
      directorContributionPending,
      investorContributionPending,
      paymentApprovals,
      upcomingPayments,
      overduePayments,
      unsettledPettyCash,
      journalErrors,
      bankReconciliationPending,
      cashFlowForecast,
    ] = await Promise.all([
      this.companyBankBalances(scope),
      this.cashBalances(scope),
      this.projectFundPosition(scope),
      this.vendorAgeing(scope, projectFilter),
      this.contractorAgeing(scope, projectFilter),
      this.customerReceivables(scope, projectFilter),
      this.contributionPending(scope, ParticipantType.Director),
      this.contributionPending(scope, ParticipantType.OutsideInvestor),
      this.paymentApprovals(scope, projectFilter),
      this.upcomingPayments(scope, projectFilter),
      this.overduePayments(scope, projectFilter),
      this.unsettledPettyCash(scope, projectFilter),
      this.journalErrors(scope),
      this.bankReconciliationPending(scope),
      this.cashFlowForecast(scope, projectFilter),
    ]);

    const summary: FinanceDashboardSummary = {
      filters: scope.filters,
      companyBankBalances,
      cashBalances,
      projectFundPosition,
      vendorAgeing,
      contractorAgeing,
      customerReceivables,
      directorContributionPending,
      investorContributionPending,
      paymentApprovals,
      upcomingPayments,
      overduePayments,
      unsettledPettyCash,
      journalErrors,
      bankReconciliationPending,
      cashFlowForecast,
    };

    return createSuccessResponse(summary, 'Finance dashboard summary');
  }

  /** Flat rows for CSV/XLSX export. */
  async buildExportRows(query: FinanceDashboardQueryDto, actorId: string) {
    const { data } = await this.getSummary(query, actorId);
    const s = data!;
    const rows: Array<{ section: string; metric: string; value: string | number }> =
      [
        { section: 'Filters', metric: 'date', value: s.filters.date },
        {
          section: 'Filters',
          metric: 'projectId',
          value: s.filters.projectId ?? '',
        },
        {
          section: 'Filters',
          metric: 'horizonDays',
          value: s.filters.horizonDays,
        },
        {
          section: 'Balances',
          metric: 'companyBankBalances',
          value: s.companyBankBalances.amount,
        },
        {
          section: 'Balances',
          metric: 'cashBalances',
          value: s.cashBalances.amount,
        },
        {
          section: 'Ageing',
          metric: 'vendorAgeing.total',
          value: s.vendorAgeing.total,
        },
        {
          section: 'Ageing',
          metric: 'vendorAgeing.d0_30',
          value: s.vendorAgeing.d0_30,
        },
        {
          section: 'Ageing',
          metric: 'vendorAgeing.d31_60',
          value: s.vendorAgeing.d31_60,
        },
        {
          section: 'Ageing',
          metric: 'vendorAgeing.d61_90',
          value: s.vendorAgeing.d61_90,
        },
        {
          section: 'Ageing',
          metric: 'vendorAgeing.d90Plus',
          value: s.vendorAgeing.d90Plus,
        },
        {
          section: 'Ageing',
          metric: 'contractorAgeing.total',
          value: s.contractorAgeing.total,
        },
        {
          section: 'Receivables',
          metric: 'customerReceivables',
          value: s.customerReceivables.amount,
        },
        {
          section: 'Contributions',
          metric: 'directorPending',
          value: s.directorContributionPending.pendingAmount,
        },
        {
          section: 'Contributions',
          metric: 'investorPending',
          value: s.investorContributionPending.pendingAmount,
        },
        {
          section: 'Payments',
          metric: 'paymentApprovals',
          value: s.paymentApprovals.amount,
        },
        {
          section: 'Payments',
          metric: 'upcomingPayments',
          value: s.upcomingPayments.amount,
        },
        {
          section: 'Payments',
          metric: 'overduePayments',
          value: s.overduePayments.amount,
        },
        {
          section: 'Petty cash',
          metric: 'unsettledPettyCash',
          value: s.unsettledPettyCash.amount,
        },
        {
          section: 'Journals',
          metric: 'journalErrors',
          value: s.journalErrors.count ?? 0,
        },
        {
          section: 'Reconciliation',
          metric: 'bankReconciliationPending',
          value: s.bankReconciliationPending.pendingCount,
        },
        {
          section: 'Cash flow',
          metric: 'forecastInflows',
          value: s.cashFlowForecast.totalInflows,
        },
        {
          section: 'Cash flow',
          metric: 'forecastOutflows',
          value: s.cashFlowForecast.totalOutflows,
        },
        {
          section: 'Cash flow',
          metric: 'forecastNet',
          value: s.cashFlowForecast.net,
        },
      ];

    for (const p of s.projectFundPosition) {
      rows.push({
        section: 'Project fund',
        metric: `${p.projectCode ?? p.projectId}.netFundPosition`,
        value: p.netFundPosition,
      });
      rows.push({
        section: 'Project fund',
        metric: `${p.projectCode ?? p.projectId}.bankBalance`,
        value: p.bankBalance,
      });
      rows.push({
        section: 'Project fund',
        metric: `${p.projectCode ?? p.projectId}.cashBalance`,
        value: p.cashBalance,
      });
    }

    for (const period of s.cashFlowForecast.series) {
      rows.push({
        section: 'Cash flow series',
        metric: `${period.label}.inflows`,
        value: period.inflows,
      });
      rows.push({
        section: 'Cash flow series',
        metric: `${period.label}.outflows`,
        value: period.outflows,
      });
      rows.push({
        section: 'Cash flow series',
        metric: `${period.label}.net`,
        value: period.net,
      });
    }

    return { rows, summary: s };
  }

  // ─── scope ─────────────────────────────────────────────────────────────

  private async resolveScope(
    query: FinanceDashboardQueryDto,
    actorId: string,
  ): Promise<Scope> {
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
      await this.projectAccessService.assertCanAccessProject(
        actorId,
        query.projectId,
        'read',
      );
      const requested = new Types.ObjectId(query.projectId);
      if (
        !access.globalAccess &&
        !projectIds.some((id) => id.equals(requested))
      ) {
        throw new ForbiddenException('Project is not accessible');
      }
      projectIds = [requested];
    }

    const day = query.date ? new Date(query.date) : new Date();
    if (Number.isNaN(day.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const dayStart = this.startOfUtcDay(day);
    const dayEnd = this.endOfUtcDay(day);

    let rangeFrom: Date | null = query.from
      ? this.startOfUtcDay(new Date(query.from))
      : null;
    let rangeTo: Date | null = query.to
      ? this.endOfUtcDay(new Date(query.to))
      : null;
    if (rangeFrom && Number.isNaN(rangeFrom.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    if (rangeTo && Number.isNaN(rangeTo.getTime())) {
      throw new BadRequestException('Invalid to date');
    }
    if (rangeFrom && rangeTo && rangeFrom > rangeTo) {
      throw new BadRequestException('from must be on or before to');
    }

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

    const horizonDays = query.horizonDays ?? 30;
    const horizonEnd = this.endOfUtcDay(
      new Date(dayStart.getTime() + horizonDays * 24 * 60 * 60 * 1000),
    );

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
      horizonDays,
      horizonEnd,
      filters: {
        date: dayStart.toISOString(),
        projectId: query.projectId ?? null,
        from: rangeFrom?.toISOString() ?? null,
        to: rangeTo?.toISOString() ?? null,
        financialYearId: query.financialYearId ?? null,
        financialYearName,
        horizonDays,
        accessibleProjectCount: projectIds.length,
      },
    };
  }

  // ─── balances / fund position ──────────────────────────────────────────

  private async companyBankBalances(scope: Scope): Promise<MoneyTile> {
    const filter: FilterQuery<CompanyBankAccount> = {
      status: BankAccountStatus.Active,
    };
    if (scope.filters.projectId) {
      filter.projectId = { $in: scope.projectIds };
    } else if (scope.projectIds.length) {
      filter.$or = [
        { projectId: { $in: scope.projectIds } },
        { projectId: null },
      ];
    }

    const accounts = await this.bankModel
      .find(filter)
      .select('_id ledgerAccountId openingBalance')
      .lean()
      .exec();
    const amount = await this.sumBalances(accounts, scope.dayEnd);
    return this.money(amount, accounts.length, [
      this.link('Company bank accounts', `${API}/company-bank-accounts`),
    ]);
  }

  private async cashBalances(scope: Scope): Promise<MoneyTile> {
    const filter: FilterQuery<CashAccount> = {
      status: { $ne: CashAccountStatus.Closed },
    };
    if (scope.projectIds.length) {
      filter.projectId = { $in: scope.projectIds };
    } else if (scope.filters.projectId) {
      return this.money(0, 0, [
        this.link('Cash accounts', `${API}/cash-accounts`),
      ]);
    }

    const accounts = await this.cashModel
      .find(filter)
      .select('_id ledgerAccountId openingBalance')
      .lean()
      .exec();
    const amount = await this.sumBalances(accounts, scope.dayEnd);
    return this.money(amount, accounts.length, [
      this.link('Cash accounts', `${API}/cash-accounts`),
    ]);
  }

  private async projectFundPosition(scope: Scope): Promise<ProjectFundRow[]> {
    if (!scope.projectIds.length) return [];

    // Include company-level accounts too: project income often posts into the
    // company bank (projectId null on the account master) with line.projectId set.
    const banks = await this.bankModel
      .find({ status: BankAccountStatus.Active })
      .select('_id projectId ledgerAccountId openingBalance')
      .lean()
      .exec();

    const cash = await this.cashModel
      .find({ status: { $ne: CashAccountStatus.Closed } })
      .select('_id projectId ledgerAccountId openingBalance')
      .lean()
      .exec();

    const companyBanks = banks.filter((a) => !a.projectId && a.ledgerAccountId);
    const companyCash = cash.filter((a) => !a.projectId && a.ledgerAccountId);
    const companyBankLedgers = companyBanks.map((a) => a.ledgerAccountId);
    const companyCashLedgers = companyCash.map((a) => a.ledgerAccountId);

    const bankByProject = new Map<string, number>();
    const cashByProject = new Map<string, number>();

    // Company share capital (and other company bank receipts with no project)
    // sits on the company bank with null projectId. Attribute that liquidity to
    // the first project so fund position matches the bank account the user sees.
    const unscopedCompanyBank = await this.sumUnscopedLedgerMovements(
      companyBankLedgers,
      scope.dayEnd,
    );
    const primaryProjectId = [...scope.projectIds]
      .map((id) => ({
        id,
        code: scope.projectMeta.get(String(id))?.projectCode ?? String(id),
      }))
      .sort((a, b) => a.code.localeCompare(b.code))[0]?.id;

    for (const oid of scope.projectIds) {
      const projectId = String(oid);
      const ownedBanks = banks.filter(
        (a) => a.projectId && String(a.projectId) === projectId,
      );
      const ownedCash = cash.filter(
        (a) => a.projectId && String(a.projectId) === projectId,
      );

      const ownedBankBalance = await this.sumBalances(ownedBanks, scope.dayEnd);
      const ownedCashBalance = await this.sumBalances(ownedCash, scope.dayEnd);
      const scopedCompanyBank = await this.sumProjectScopedLedgerMovements(
        oid,
        companyBankLedgers,
        scope.dayEnd,
      );
      const scopedCompanyCash = await this.sumProjectScopedLedgerMovements(
        oid,
        companyCashLedgers,
        scope.dayEnd,
      );
      const capitalShare =
        primaryProjectId && oid.equals(primaryProjectId)
          ? unscopedCompanyBank
          : 0;

      bankByProject.set(
        projectId,
        this.round2(ownedBankBalance + scopedCompanyBank + capitalShare),
      );
      cashByProject.set(
        projectId,
        this.round2(ownedCashBalance + scopedCompanyCash),
      );
    }

    const vendorPay = await this.vendorPayableByProject(scope.projectIds);
    const contractorPay = await this.contractorPayableByProject(
      scope.projectIds,
    );

    return scope.projectIds.map((oid) => {
      const projectId = String(oid);
      const meta = scope.projectMeta.get(projectId);
      const bankBalance = bankByProject.get(projectId) ?? 0;
      const cashBalance = cashByProject.get(projectId) ?? 0;
      const vendorPayable = vendorPay.get(projectId) ?? 0;
      const contractorPayable = contractorPay.get(projectId) ?? 0;
      const totalLiquidity = this.round2(bankBalance + cashBalance);
      const netFundPosition = this.round2(
        totalLiquidity - vendorPayable - contractorPayable,
      );
      return {
        projectId,
        projectCode: meta?.projectCode ?? null,
        projectName: meta?.projectName ?? null,
        bankBalance,
        cashBalance,
        totalLiquidity,
        vendorPayable,
        contractorPayable,
        netFundPosition,
        drillDown: [
          this.link(
            'Project dashboard',
            `${API}/projects/${projectId}/dashboard`,
          ),
          this.link(
            'Bank accounts',
            `${API}/company-bank-accounts?projectId=${projectId}`,
          ),
        ],
      };
    });
  }

  // ─── ageing / receivables ──────────────────────────────────────────────

  private async vendorAgeing(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<AgeingBuckets> {
    const rows = await this.vendorInvoiceModel
      .find({
        projectId: projectFilter,
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('dueDate totalAmount tds retention paidAmount')
      .lean()
      .exec();

    const buckets = this.emptyAgeing([
      this.link('Vendor invoices', `${API}/vendor-invoices${this.qs(scope)}`),
    ]);

    for (const r of rows) {
      const remaining = this.round2(
        (r.totalAmount ?? 0) -
          (r.tds ?? 0) -
          (r.retention ?? 0) -
          (r.paidAmount ?? 0),
      );
      if (remaining <= 0) continue;
      this.addAgeing(buckets, r.dueDate, remaining, scope.dayStart);
    }
    return buckets;
  }

  private async contractorAgeing(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<AgeingBuckets> {
    const rows = await this.contractorBillModel
      .find({
        projectId: projectFilter,
        status: {
          $in: [
            ContractorBillStatus.Posted,
            ContractorBillStatus.DirectorApproved,
            ContractorBillStatus.FinanceVerified,
            ContractorBillStatus.PmCertified,
          ],
        },
      })
      .select('netPayable paidAmount postedAt directorApprovedAt billingPeriod')
      .lean()
      .exec();

    const buckets = this.emptyAgeing([
      this.link(
        'Contractor bills',
        `${API}/contractor-bills${this.qs(scope)}`,
      ),
    ]);

    for (const r of rows) {
      const remaining = this.round2((r.netPayable ?? 0) - (r.paidAmount ?? 0));
      if (remaining <= 0) continue;
      const anchor =
        r.postedAt ??
        r.directorApprovedAt ??
        r.billingPeriod?.to ??
        null;
      this.addAgeing(buckets, anchor, remaining, scope.dayStart);
    }
    return buckets;
  }

  private async customerReceivables(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const scheduleAgg = await this.paymentScheduleModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            status: PaymentScheduleStatus.Active,
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.status': {
              $in: [
                PaymentScheduleLineStatus.Pending,
                PaymentScheduleLineStatus.Due,
                PaymentScheduleLineStatus.Demanded,
                PaymentScheduleLineStatus.Overdue,
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

    const demandAgg = await this.paymentDemandModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            status: PaymentDemandStatus.Issued,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $subtract: ['$totalAmount', '$collectedAmount'],
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    // Prefer schedule open lines as primary AR; demands may overlap — use max of schedule total
    // when demands are subset, else sum schedule (demands are generated from lines).
    const scheduleTotal = Math.max(0, scheduleAgg[0]?.total ?? 0);
    const scheduleCount = scheduleAgg[0]?.count ?? 0;
    const demandCount = demandAgg[0]?.count ?? 0;

    return this.money(this.round2(scheduleTotal), scheduleCount + demandCount, [
      this.link(
        'Payment schedules overdue',
        `${API}/payment-schedules/overdue${this.qs(scope)}`,
      ),
      this.link(
        'Customer receipts',
        `${API}/customer-receipts${this.qs(scope)}`,
      ),
    ]);
  }

  private async contributionPending(
    scope: Scope,
    participantType: ParticipantType.Director | ParticipantType.OutsideInvestor,
  ): Promise<ContributionPending> {
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
        commitmentCount: 0,
        drillDown: [
          this.link('Projects', `${API}/projects`),
        ],
      };
    }

    const participants = await this.participantModel
      .find({
        projectId: { $in: scope.projectIds },
        participantType,
        status: ParticipantApprovalStatus.Approved,
        effectiveTo: null,
      })
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
        commitmentCount: 0,
        drillDown: [
          this.link(
            'Commitments',
            `${API}/projects/${String(scope.projectIds[0])}/commitments`,
          ),
        ],
      };
    }

    const filter: FilterQuery<ContributionCommitment> = {
      projectId: { $in: scope.projectIds },
      participantId: { $in: participantOids },
      status: CommitmentStatus.Approved,
    };
    this.applyRange(filter, 'commitmentDate', scope);

    const rows = await this.commitmentModel
      .find(filter)
      .select('commitmentAmount receivedAmount')
      .lean()
      .exec();

    const committedAmount = this.round2(
      rows.reduce((s, r) => s + (r.commitmentAmount ?? 0), 0),
    );
    const receivedAmount = this.round2(
      rows.reduce((s, r) => s + (r.receivedAmount ?? 0), 0),
    );

    const primary = String(scope.projectIds[0]);
    return {
      participantType: typeLabel,
      committedAmount,
      receivedAmount,
      pendingAmount: this.round2(Math.max(0, committedAmount - receivedAmount)),
      commitmentCount: rows.length,
      drillDown: [
        this.link(
          `${typeLabel} commitments`,
          `${API}/projects/${primary}/commitments`,
        ),
        this.link(
          'Commitment summary',
          `${API}/projects/${primary}/commitments/summary`,
        ),
      ],
    };
  }

  // ─── payments / petty / journals / forecast ────────────────────────────

  private async paymentApprovals(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const [vendorAgg] = await this.vendorPaymentModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            status: VendorPaymentStatus.Approval,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$bankAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const [contractorAgg] = await this.contractorPaymentModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            status: ContractorPaymentStatus.Approval,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$bankAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const amount = this.round2(
      (vendorAgg?.total ?? 0) + (contractorAgg?.total ?? 0),
    );
    const count = (vendorAgg?.count ?? 0) + (contractorAgg?.count ?? 0);

    return this.money(amount, count, [
      this.link(
        'Vendor payments pending approval',
        `${API}/vendor-payments?status=approval${this.amp(scope)}`,
      ),
      this.link(
        'Contractor payments pending approval',
        `${API}/contractor-payments?status=approval${this.amp(scope)}`,
      ),
    ]);
  }

  private async upcomingPayments(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const vendorRows = await this.vendorInvoiceModel
      .find({
        projectId: projectFilter,
        dueDate: { $gte: scope.dayStart, $lte: scope.horizonEnd },
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let amount = 0;
    let count = 0;
    for (const r of vendorRows) {
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
            projectId: projectFilter,
            status: PaymentScheduleStatus.Active,
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.dueDate': { $gte: scope.dayStart, $lte: scope.horizonEnd },
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

    // Upcoming *payments* (outflows) — vendor only; schedule lines are receivables.
    // Keep vendor outflows as the tile amount; count can include both for awareness.
    count += scheduleAgg[0]?.count ?? 0;

    return this.money(this.round2(amount), count, [
      this.link(
        'Vendor invoices due',
        `${API}/vendor-invoices${this.qs(scope)}`,
      ),
      this.link(
        'Customer schedules due',
        `${API}/payment-schedules${this.qs(scope)}`,
      ),
    ]);
  }

  private async overduePayments(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const vendorRows = await this.vendorInvoiceModel
      .find({
        projectId: projectFilter,
        dueDate: { $lt: scope.dayStart },
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('totalAmount tds retention paidAmount')
      .lean()
      .exec();

    let amount = 0;
    let count = 0;
    for (const r of vendorRows) {
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
            projectId: projectFilter,
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

    return this.money(this.round2(amount), count, [
      this.link('Overdue vendor invoices', `${API}/vendor-invoices${this.qs(scope)}`),
      this.link(
        'Overdue customer schedules',
        `${API}/payment-schedules/overdue${this.qs(scope)}`,
      ),
    ]);
  }

  private async unsettledPettyCash(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<MoneyTile> {
    const [agg] = await this.pettyCashRequirementModel
      .aggregate<{ total: number; count: number }>([
        {
          $match: {
            projectId: projectFilter,
            status: PettyCashRequirementStatus.Funded,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$fundedAmount', 0] } },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return this.money(this.round2(agg?.total ?? 0), agg?.count ?? 0, [
      this.link(
        'Funded petty cash requirements',
        `${API}/petty-cash-requirements?status=funded${this.amp(scope)}`,
      ),
    ]);
  }

  private async journalErrors(scope: Scope): Promise<MoneyTile> {
    const match: FilterQuery<JournalEntry> = {
      status: {
        $in: [JournalStatus.PendingApproval, JournalStatus.Cancelled],
      },
    };
    if (scope.projectIds.length && scope.filters.projectId) {
      match.projectId = { $in: scope.projectIds };
    }
    this.applyRange(match, 'journalDate', scope);

    const [agg] = await this.journalModel
      .aggregate<{ count: number; pending: number; cancelled: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [
                  { $eq: ['$status', JournalStatus.PendingApproval] },
                  1,
                  0,
                ],
              },
            },
            cancelled: {
              $sum: {
                $cond: [
                  { $eq: ['$status', JournalStatus.Cancelled] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .exec();

    return this.money(0, agg?.count ?? 0, [
      this.link(
        'Journals pending approval',
        `${API}/journals?status=pending_approval`,
      ),
      this.link('Cancelled journals', `${API}/journals?status=cancelled`),
    ]);
  }

  private async bankReconciliationPending(
    scope: Scope,
  ): Promise<BankReconciliationPending> {
    const bankFilter: FilterQuery<CompanyBankAccount> = {
      status: BankAccountStatus.Active,
    };
    if (scope.filters.projectId) {
      bankFilter.projectId = { $in: scope.projectIds };
    } else if (scope.projectIds.length) {
      bankFilter.$or = [
        { projectId: { $in: scope.projectIds } },
        { projectId: null },
      ];
    }

    const banks = await this.bankModel
      .find(bankFilter)
      .select('_id')
      .lean()
      .exec();
    const bankIds = banks.map((b) => b._id as Types.ObjectId);

    const drillDown = [
      this.link('Bank reconciliation sessions', `${API}/bank-reconciliation/sessions`),
      this.link('Company bank accounts', `${API}/company-bank-accounts`),
    ];

    if (!bankIds.length) {
      return {
        available: true,
        pendingCount: 0,
        amount: 0,
        message: 'No active bank accounts in scope',
        drillDown,
      };
    }

    const openStatuses = [
      BankReconciliationSessionStatus.Draft,
      BankReconciliationSessionStatus.InProgress,
    ];

    const sessions = await this.bankReconSessionModel
      .find({
        bankAccountId: { $in: bankIds },
        status: { $in: openStatuses },
      })
      .select('_id status')
      .lean()
      .exec();

    const pendingCount = sessions.length;
    const sessionIds = sessions.map((s) => s._id as Types.ObjectId);

    let amount = 0;
    let unmatchedLineCount = 0;
    if (sessionIds.length) {
      const [agg] = await this.bankStatementLineModel
        .aggregate<{ total: number; count: number }>([
          {
            $match: {
              sessionId: { $in: sessionIds },
              status: BankStatementLineStatus.Unmatched,
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: { $add: ['$debit', '$credit'] },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .exec();
      amount = this.round2(agg?.total ?? 0);
      unmatchedLineCount = agg?.count ?? 0;
    }

    const draftCount = sessions.filter(
      (s) => s.status === BankReconciliationSessionStatus.Draft,
    ).length;
    const inProgressCount = sessions.filter(
      (s) => s.status === BankReconciliationSessionStatus.InProgress,
    ).length;

    let message: string;
    if (pendingCount === 0) {
      message = 'No open reconciliation sessions';
    } else if (unmatchedLineCount === 0) {
      message = `${pendingCount} open session(s) (${draftCount} draft, ${inProgressCount} in progress); no unmatched lines`;
    } else {
      message = `${pendingCount} open session(s) (${draftCount} draft, ${inProgressCount} in progress); ${unmatchedLineCount} unmatched line(s)`;
    }

    return {
      available: true,
      pendingCount,
      amount,
      message,
      drillDown,
    };
  }

  private async cashFlowForecast(
    scope: Scope,
    projectFilter: { $in: Types.ObjectId[] },
  ): Promise<CashFlowForecast> {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks = Math.max(1, Math.ceil(scope.horizonDays / 7));
    const series: CashFlowPeriod[] = [];

    for (let i = 0; i < weeks; i++) {
      const periodStart = new Date(scope.dayStart.getTime() + i * weekMs);
      const periodEnd = this.endOfUtcDay(
        new Date(
          Math.min(
            periodStart.getTime() + weekMs - 1,
            scope.horizonEnd.getTime(),
          ),
        ),
      );
      series.push({
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        label: `W${i + 1}`,
        inflows: 0,
        outflows: 0,
        net: 0,
      });
    }

    const vendorRows = await this.vendorInvoiceModel
      .find({
        projectId: projectFilter,
        dueDate: { $gte: scope.dayStart, $lte: scope.horizonEnd },
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('dueDate totalAmount tds retention paidAmount')
      .lean()
      .exec();

    for (const r of vendorRows) {
      const remaining = this.round2(
        (r.totalAmount ?? 0) -
          (r.tds ?? 0) -
          (r.retention ?? 0) -
          (r.paidAmount ?? 0),
      );
      if (remaining <= 0 || !r.dueDate) continue;
      const bucket = this.periodIndex(series, new Date(r.dueDate));
      if (bucket >= 0) series[bucket].outflows += remaining;
    }

    const scheduleLines = await this.paymentScheduleModel
      .aggregate<{ dueDate: Date; amount: number }>([
        {
          $match: {
            projectId: projectFilter,
            status: PaymentScheduleStatus.Active,
          },
        },
        { $unwind: '$lines' },
        {
          $match: {
            'lines.dueDate': { $gte: scope.dayStart, $lte: scope.horizonEnd },
            'lines.status': {
              $in: [
                PaymentScheduleLineStatus.Pending,
                PaymentScheduleLineStatus.Due,
                PaymentScheduleLineStatus.Demanded,
                PaymentScheduleLineStatus.Overdue,
              ],
            },
          },
        },
        {
          $project: {
            dueDate: '$lines.dueDate',
            amount: {
              $subtract: [
                { $add: ['$lines.amount', '$lines.tax'] },
                '$lines.collectedAmount',
              ],
            },
          },
        },
      ])
      .exec();

    for (const line of scheduleLines) {
      if (!line.dueDate || (line.amount ?? 0) <= 0) continue;
      const bucket = this.periodIndex(series, new Date(line.dueDate));
      if (bucket >= 0) series[bucket].inflows += line.amount;
    }

    // Contribution pending tranches with dueDate in horizon
    if (scope.projectIds.length) {
      const commitments = await this.commitmentModel
        .find({
          projectId: { $in: scope.projectIds },
          status: CommitmentStatus.Approved,
          dueDate: { $gte: scope.dayStart, $lte: scope.horizonEnd },
        })
        .select('commitmentAmount receivedAmount dueDate')
        .lean()
        .exec();

      for (const c of commitments) {
        const pending = this.round2(
          Math.max(0, (c.commitmentAmount ?? 0) - (c.receivedAmount ?? 0)),
        );
        if (pending <= 0 || !c.dueDate) continue;
        const bucket = this.periodIndex(series, new Date(c.dueDate));
        if (bucket >= 0) series[bucket].inflows += pending;
      }
    }

    let totalInflows = 0;
    let totalOutflows = 0;
    for (const p of series) {
      p.inflows = this.round2(p.inflows);
      p.outflows = this.round2(p.outflows);
      p.net = this.round2(p.inflows - p.outflows);
      totalInflows += p.inflows;
      totalOutflows += p.outflows;
    }

    return {
      horizonDays: scope.horizonDays,
      totalInflows: this.round2(totalInflows),
      totalOutflows: this.round2(totalOutflows),
      net: this.round2(totalInflows - totalOutflows),
      series,
      drillDown: [
        this.link('Vendor invoices', `${API}/vendor-invoices${this.qs(scope)}`),
        this.link(
          'Payment schedules',
          `${API}/payment-schedules${this.qs(scope)}`,
        ),
      ],
    };
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private async vendorPayableByProject(
    projectIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    const rows = await this.vendorInvoiceModel
      .find({
        projectId: { $in: projectIds },
        status: {
          $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
        },
      })
      .select('projectId totalAmount tds retention paidAmount')
      .lean()
      .exec();

    const map = new Map<string, number>();
    for (const r of rows) {
      const remaining = this.round2(
        (r.totalAmount ?? 0) -
          (r.tds ?? 0) -
          (r.retention ?? 0) -
          (r.paidAmount ?? 0),
      );
      if (remaining <= 0) continue;
      const key = String(r.projectId);
      map.set(key, this.round2((map.get(key) ?? 0) + remaining));
    }
    return map;
  }

  private async contractorPayableByProject(
    projectIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    const rows = await this.contractorBillModel
      .find({
        projectId: { $in: projectIds },
        status: {
          $in: [
            ContractorBillStatus.Posted,
            ContractorBillStatus.DirectorApproved,
            ContractorBillStatus.FinanceVerified,
            ContractorBillStatus.PmCertified,
          ],
        },
      })
      .select('projectId netPayable paidAmount')
      .lean()
      .exec();

    const map = new Map<string, number>();
    for (const r of rows) {
      const remaining = this.round2((r.netPayable ?? 0) - (r.paidAmount ?? 0));
      if (remaining <= 0) continue;
      const key = String(r.projectId);
      map.set(key, this.round2((map.get(key) ?? 0) + remaining));
    }
    return map;
  }

  private async sumBalances(
    accounts: Array<{
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

  /**
   * Net debit−credit on company-level bank/cash ledgers for journals scoped to
   * a project (line.projectId or header projectId). Opening balance is excluded
   * — that remains company liquidity, not project fund.
   */
  private async sumProjectScopedLedgerMovements(
    projectId: Types.ObjectId,
    ledgerIds: Types.ObjectId[],
    asOf: Date,
  ): Promise<number> {
    if (!ledgerIds.length) return 0;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: JournalStatus.Posted,
          journalDate: { $lte: asOf },
          'lines.accountId': { $in: ledgerIds },
          $or: [{ projectId }, { 'lines.projectId': projectId }],
        },
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.accountId': { $in: ledgerIds },
          $or: [
            { 'lines.projectId': projectId },
            {
              $and: [
                {
                  $or: [
                    { 'lines.projectId': null },
                    { 'lines.projectId': { $exists: false } },
                  ],
                },
                { projectId },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ];

    const rows = await this.journalModel.aggregate(pipeline).exec();
    const row = rows[0];
    if (!row) return 0;
    return this.round2((row.totalDebit ?? 0) - (row.totalCredit ?? 0));
  }

  /**
   * Company bank/cash movements with no project (e.g. share capital receipt).
   */
  private async sumUnscopedLedgerMovements(
    ledgerIds: Types.ObjectId[],
    asOf: Date,
  ): Promise<number> {
    if (!ledgerIds.length) return 0;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: JournalStatus.Posted,
          journalDate: { $lte: asOf },
          'lines.accountId': { $in: ledgerIds },
          $or: [
            { projectId: null },
            { projectId: { $exists: false } },
            { sourceModule: 'share_capital' },
          ],
        },
      },
      { $unwind: '$lines' },
      {
        $match: {
          'lines.accountId': { $in: ledgerIds },
          $or: [
            { 'lines.projectId': null },
            { 'lines.projectId': { $exists: false } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: '$lines.debit' },
          totalCredit: { $sum: '$lines.credit' },
        },
      },
    ];

    const rows = await this.journalModel.aggregate(pipeline).exec();
    const row = rows[0];
    if (!row) return 0;
    return this.round2((row.totalDebit ?? 0) - (row.totalCredit ?? 0));
  }

  private emptyAgeing(drillDown: DrillDownLink[]): AgeingBuckets {
    return {
      current: 0,
      d0_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90Plus: 0,
      total: 0,
      count: 0,
      drillDown,
    };
  }

  private addAgeing(
    buckets: AgeingBuckets,
    dueOrAnchor: Date | null | undefined,
    amount: number,
    asOf: Date,
  ) {
    buckets.total = this.round2(buckets.total + amount);
    buckets.count += 1;
    if (!dueOrAnchor) {
      buckets.d90Plus = this.round2(buckets.d90Plus + amount);
      return;
    }
    const due = new Date(dueOrAnchor);
    const days = Math.floor(
      (asOf.getTime() - this.startOfUtcDay(due).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (days < 0) {
      buckets.current = this.round2(buckets.current + amount);
    } else if (days <= 30) {
      buckets.d0_30 = this.round2(buckets.d0_30 + amount);
    } else if (days <= 60) {
      buckets.d31_60 = this.round2(buckets.d31_60 + amount);
    } else if (days <= 90) {
      buckets.d61_90 = this.round2(buckets.d61_90 + amount);
    } else {
      buckets.d90Plus = this.round2(buckets.d90Plus + amount);
    }
  }

  private periodIndex(series: CashFlowPeriod[], date: Date): number {
    const t = date.getTime();
    for (let i = 0; i < series.length; i++) {
      const start = new Date(series[i].periodStart).getTime();
      const end = new Date(series[i].periodEnd).getTime();
      if (t >= start && t <= end) return i;
    }
    return -1;
  }

  private applyRange(
    match: Record<string, unknown>,
    field: string,
    scope: Scope,
  ) {
    if (scope.rangeFrom || scope.rangeTo) {
      const range: Record<string, Date> = {};
      if (scope.rangeFrom) range.$gte = scope.rangeFrom;
      if (scope.rangeTo) range.$lte = scope.rangeTo;
      match[field] = range;
    }
  }

  private money(
    amount: number,
    count: number | undefined,
    drillDown: DrillDownLink[],
  ): MoneyTile {
    return { amount, count, drillDown };
  }

  private link(label: string, href: string): DrillDownLink {
    return { label, href };
  }

  private qs(scope: Scope): string {
    if (scope.filters.projectId) {
      return `?projectId=${scope.filters.projectId}`;
    }
    if (scope.projectIds.length === 1) {
      return `?projectId=${String(scope.projectIds[0])}`;
    }
    return '';
  }

  private amp(scope: Scope): string {
    const q = this.qs(scope);
    if (!q) return '';
    return `&${q.slice(1)}`;
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
