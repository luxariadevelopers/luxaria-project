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
  Account,
  AccountCategory,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import { Contractor } from '../contractors/schemas/contractor.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { Director } from '../directors/schemas/director.schema';
import {
  FinancialYear,
} from '../financial-year/schemas/financial-year.schema';
import { Investor } from '../investors/schemas/investor.schema';
import {
  JournalEntry,
  JournalPartyType,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { Project } from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import { Vendor } from '../vendors/schemas/vendor.schema';
import {
  ACCOUNTING_REPORT_LABELS,
  AccountingReportType,
  ALL_ACCOUNTING_REPORTS,
} from './accounting-reports.constants';
import type {
  AccountingReportPayload,
  AgeingBucketRow,
  CostSheetRow,
  DrillDownLink,
  FundLine,
  JournalRegisterRow,
  LedgerLineRow,
  PartyLedgerRow,
  ProfitAndLossSection,
  ReportFiltersApplied,
  ReportMeta,
  TrialBalanceRow,
} from './accounting-reports.types';
import type { AccountingReportsQueryDto } from './dto/accounting-reports-query.dto';

const API = '/api/v1';

type ReportScope = {
  filters: ReportFiltersApplied;
  financialYearId: Types.ObjectId | null;
  projectId: Types.ObjectId | null;
  from: Date | null;
  to: Date | null;
  accountId: Types.ObjectId | null;
  partyId: Types.ObjectId | null;
};

type FlatLine = {
  journalId: string;
  journalNumber: string;
  journalDate: Date;
  narration: string;
  accountId: string;
  debit: number;
  credit: number;
  projectId: string | null;
  partyType: string | null;
  partyId: string | null;
  description: string | null;
  sourceModule: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
};

@Injectable()
export class AccountingReportsService {
  constructor(
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    @InjectModel(FinancialYear.name)
    private readonly fyModel: Model<FinancialYear>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(VendorInvoice.name)
    private readonly vendorInvoiceModel: Model<VendorInvoice>,
    @InjectModel(ContractorBill.name)
    private readonly contractorBillModel: Model<ContractorBill>,
    @InjectModel(PaymentSchedule.name)
    private readonly paymentScheduleModel: Model<PaymentSchedule>,
    @InjectModel(Vendor.name) private readonly vendorModel: Model<Vendor>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(Director.name) private readonly directorModel: Model<Director>,
    @InjectModel(Investor.name) private readonly investorModel: Model<Investor>,
  ) {}

  listReports() {
    return createSuccessResponse(
      ALL_ACCOUNTING_REPORTS.map((reportType) => ({
        reportType,
        title: ACCOUNTING_REPORT_LABELS[reportType],
        path: `${API}/accounting-reports/${reportType}`,
        exportPath: `${API}/accounting-reports/${reportType}/export`,
      })),
      'Accounting reports catalogue',
    );
  }

  async getReport(
    reportType: AccountingReportType,
    query: AccountingReportsQueryDto,
  ) {
    if (!ALL_ACCOUNTING_REPORTS.includes(reportType)) {
      throw new BadRequestException(`Unknown report type: ${reportType}`);
    }
    const scope = await this.resolveScope(query);
    const payload = await this.buildReport(reportType, scope);
    return createSuccessResponse(payload, ACCOUNTING_REPORT_LABELS[reportType]);
  }

  async buildReport(
    reportType: AccountingReportType,
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    switch (reportType) {
      case AccountingReportType.TrialBalance:
        return this.trialBalance(scope);
      case AccountingReportType.GeneralLedger:
        return this.generalLedger(scope);
      case AccountingReportType.JournalRegister:
        return this.journalRegister(scope);
      case AccountingReportType.CashBook:
        return this.cashOrBankBook(scope, 'cash');
      case AccountingReportType.BankBook:
        return this.cashOrBankBook(scope, 'bank');
      case AccountingReportType.ProjectCostSheet:
        return this.projectCostSheet(scope);
      case AccountingReportType.ProjectProfitAndLoss:
        return this.projectProfitAndLoss(scope);
      case AccountingReportType.VendorLedger:
        return this.partyLedger(scope, JournalPartyType.Vendor);
      case AccountingReportType.ContractorLedger:
        return this.partyLedger(scope, JournalPartyType.Contractor);
      case AccountingReportType.DirectorLedger:
        return this.partyLedger(scope, JournalPartyType.Director);
      case AccountingReportType.InvestorLedger:
        return this.partyLedger(scope, JournalPartyType.Investor);
      case AccountingReportType.CustomerLedger:
        return this.partyLedger(scope, JournalPartyType.Customer);
      case AccountingReportType.CustomerAdvanceReport:
        return this.customerAdvanceReport(scope);
      case AccountingReportType.AccountsPayableAgeing:
        return this.accountsPayableAgeing(scope);
      case AccountingReportType.AccountsReceivableAgeing:
        return this.accountsReceivableAgeing(scope);
      case AccountingReportType.SourceAndUtilisationOfFunds:
        return this.sourceAndUtilisation(scope);
      case AccountingReportType.CashFlow:
        return this.cashFlow(scope);
      case AccountingReportType.ProjectFundFlow:
        return this.projectFundFlow(scope);
      default:
        throw new BadRequestException(`Unsupported report: ${reportType}`);
    }
  }

  // ─── scope ─────────────────────────────────────────────────────────────

  private async resolveScope(
    query: AccountingReportsQueryDto,
  ): Promise<ReportScope> {
    let from: Date | null = query.from ? new Date(query.from) : null;
    let to: Date | null = query.to ? new Date(query.to) : null;
    let financialYearId: Types.ObjectId | null = null;
    let financialYearName: string | null = null;

    if (query.financialYearId) {
      if (!Types.ObjectId.isValid(query.financialYearId)) {
        throw new BadRequestException('Invalid financialYearId');
      }
      const fy = await this.fyModel.findById(query.financialYearId).lean().exec();
      if (!fy) throw new NotFoundException('Financial year not found');
      financialYearId = fy._id as Types.ObjectId;
      financialYearName = fy.name;
      if (!from) from = new Date(fy.startDate);
      if (!to) to = new Date(fy.endDate);
    }

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

    const accountId =
      query.accountId && Types.ObjectId.isValid(query.accountId)
        ? new Types.ObjectId(query.accountId)
        : null;
    const partyId =
      query.partyId && Types.ObjectId.isValid(query.partyId)
        ? new Types.ObjectId(query.partyId)
        : null;

    return {
      financialYearId,
      projectId,
      from,
      to,
      accountId,
      partyId,
      filters: {
        financialYearId: financialYearId ? String(financialYearId) : null,
        financialYearName,
        projectId: projectId ? String(projectId) : null,
        projectCode,
        projectName,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        accountId: accountId ? String(accountId) : null,
        partyId: partyId ? String(partyId) : null,
      },
    };
  }

  private meta(
    reportType: AccountingReportType,
    scope: ReportScope,
    reconciled: boolean,
    reconciliationNotes: string[] = [],
  ): ReportMeta {
    return {
      reportType,
      title: ACCOUNTING_REPORT_LABELS[reportType],
      filters: scope.filters,
      generatedAt: new Date().toISOString(),
      reconciled,
      reconciliationNotes,
    };
  }

  // ─── journal line loading ──────────────────────────────────────────────

  private baseJournalMatch(scope: ReportScope): FilterQuery<JournalEntry> {
    const match: FilterQuery<JournalEntry> = {
      status: JournalStatus.Posted,
    };
    if (scope.financialYearId) {
      match.financialYearId = scope.financialYearId;
    }
    if (scope.from || scope.to) {
      match.journalDate = {};
      if (scope.from) {
        (match.journalDate as Record<string, Date>).$gte = scope.from;
      }
      if (scope.to) {
        (match.journalDate as Record<string, Date>).$lte = scope.to;
      }
    }
    return match;
  }

  private async loadFlatLines(
    scope: ReportScope,
    opts: {
      accountIds?: Types.ObjectId[];
      partyType?: JournalPartyType;
      partyId?: Types.ObjectId | null;
      beforeDate?: Date | null;
      categories?: AccountCategory[];
      accountTypes?: AccountType[];
    } = {},
  ): Promise<FlatLine[]> {
    let match: FilterQuery<JournalEntry>;
    if (opts.beforeDate) {
      // Opening movements: all posted journals before period start (cross-FY)
      match = {
        status: JournalStatus.Posted,
        journalDate: { $lt: opts.beforeDate },
      };
    } else {
      match = this.baseJournalMatch(scope);
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $unwind: '$lines' },
    ];

    const lineMatch: Record<string, unknown> = {};
    if (opts.accountIds?.length) {
      lineMatch['lines.accountId'] = { $in: opts.accountIds };
    }
    if (scope.accountId && !opts.accountIds) {
      lineMatch['lines.accountId'] = scope.accountId;
    }
    if (scope.projectId) {
      lineMatch.$or = [
        { 'lines.projectId': scope.projectId },
        {
          $and: [
            {
              $or: [
                { 'lines.projectId': null },
                { 'lines.projectId': { $exists: false } },
              ],
            },
            { projectId: scope.projectId },
          ],
        },
      ];
    }
    if (opts.partyType) {
      lineMatch['lines.partyType'] = opts.partyType;
    }
    if (opts.partyId) {
      lineMatch['lines.partyId'] = opts.partyId;
    } else if (scope.partyId && opts.partyType) {
      lineMatch['lines.partyId'] = scope.partyId;
    }

    if (Object.keys(lineMatch).length) {
      pipeline.push({ $match: lineMatch });
    }

    pipeline.push({
      $project: {
        journalId: '$_id',
        journalNumber: 1,
        journalDate: 1,
        narration: 1,
        sourceModule: 1,
        sourceEntityType: 1,
        sourceEntityId: 1,
        accountId: '$lines.accountId',
        debit: '$lines.debit',
        credit: '$lines.credit',
        projectId: '$lines.projectId',
        partyType: '$lines.partyType',
        partyId: '$lines.partyId',
        description: '$lines.description',
      },
    });
    pipeline.push({ $sort: { journalDate: 1, journalNumber: 1, _id: 1 } });

    const rows = await this.journalModel.aggregate(pipeline).exec();
    let flat: FlatLine[] = rows.map((r) => ({
      journalId: String(r.journalId),
      journalNumber: r.journalNumber,
      journalDate: new Date(r.journalDate),
      narration: r.narration,
      accountId: String(r.accountId),
      debit: r.debit ?? 0,
      credit: r.credit ?? 0,
      projectId: r.projectId ? String(r.projectId) : null,
      partyType: r.partyType ?? null,
      partyId: r.partyId ? String(r.partyId) : null,
      description: r.description ?? null,
      sourceModule: r.sourceModule ?? null,
      sourceEntityType: r.sourceEntityType ?? null,
      sourceEntityId: r.sourceEntityId ?? null,
    }));

    if (opts.categories?.length || opts.accountTypes?.length) {
      const accounts = await this.accountMap(flat.map((f) => f.accountId));
      flat = flat.filter((f) => {
        const a = accounts.get(f.accountId);
        if (!a) return false;
        if (opts.categories?.length && !opts.categories.includes(a.accountCategory)) {
          return false;
        }
        if (opts.accountTypes?.length && !opts.accountTypes.includes(a.accountType)) {
          return false;
        }
        return true;
      });
    }

    return flat;
  }

  private async accountMap(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map<string, Account>();
    const rows = await this.accountModel
      .find({ _id: { $in: unique.map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec();
    return new Map(rows.map((a) => [String(a._id), a as Account]));
  }

  private journalDrill(line: FlatLine): DrillDownLink[] {
    const links: DrillDownLink[] = [
      {
        label: `Journal ${line.journalNumber}`,
        href: `${API}/journals/${line.journalId}`,
        journalId: line.journalId,
        sourceModule: line.sourceModule,
        sourceEntityType: line.sourceEntityType,
        sourceEntityId: line.sourceEntityId,
      },
    ];
    if (line.sourceModule && line.sourceEntityId) {
      links.push({
        label: `Source ${line.sourceModule}`,
        href: `${API}/${line.sourceModule.replace(/_/g, '-')}s/${line.sourceEntityId}`,
        journalId: line.journalId,
        sourceModule: line.sourceModule,
        sourceEntityType: line.sourceEntityType,
        sourceEntityId: line.sourceEntityId,
      });
    }
    return links;
  }

  // ─── reports ───────────────────────────────────────────────────────────

  private async trialBalance(scope: ReportScope): Promise<AccountingReportPayload> {
    const periodLines = await this.loadFlatLines(scope);
    const openingLines = scope.from
      ? await this.loadFlatLines(scope, { beforeDate: scope.from })
      : [];

    const accounts = await this.accountMap([
      ...periodLines.map((l) => l.accountId),
      ...openingLines.map((l) => l.accountId),
    ]);

    const byAccount = new Map<
      string,
      {
        openingDebit: number;
        openingCredit: number;
        periodDebit: number;
        periodCredit: number;
      }
    >();

    const ensure = (id: string) => {
      if (!byAccount.has(id)) {
        byAccount.set(id, {
          openingDebit: 0,
          openingCredit: 0,
          periodDebit: 0,
          periodCredit: 0,
        });
      }
      return byAccount.get(id)!;
    };

    for (const l of openingLines) {
      const row = ensure(l.accountId);
      row.openingDebit += l.debit;
      row.openingCredit += l.credit;
    }
    for (const l of periodLines) {
      const row = ensure(l.accountId);
      row.periodDebit += l.debit;
      row.periodCredit += l.credit;
    }

    const rows: TrialBalanceRow[] = [];
    let totalOpeningDebit = 0;
    let totalOpeningCredit = 0;
    let totalPeriodDebit = 0;
    let totalPeriodCredit = 0;
    let totalClosingDebit = 0;
    let totalClosingCredit = 0;

    for (const [accountId, agg] of byAccount) {
      const account = accounts.get(accountId);
      if (!account || account.isControlAccount) continue;

      const openingNet = agg.openingDebit - agg.openingCredit;
      const closingNet =
        openingNet + agg.periodDebit - agg.periodCredit;
      const openingDebit = openingNet > 0 ? this.round2(openingNet) : 0;
      const openingCredit = openingNet < 0 ? this.round2(-openingNet) : 0;
      const closingDebit = closingNet > 0 ? this.round2(closingNet) : 0;
      const closingCredit = closingNet < 0 ? this.round2(-closingNet) : 0;

      totalOpeningDebit += openingDebit;
      totalOpeningCredit += openingCredit;
      totalPeriodDebit += agg.periodDebit;
      totalPeriodCredit += agg.periodCredit;
      totalClosingDebit += closingDebit;
      totalClosingCredit += closingCredit;

      rows.push({
        accountId,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        openingDebit,
        openingCredit,
        periodDebit: this.round2(agg.periodDebit),
        periodCredit: this.round2(agg.periodCredit),
        closingDebit,
        closingCredit,
        drillDown: [
          {
            label: 'General ledger',
            href: `${API}/accounting-reports/general-ledger?accountId=${accountId}${
              scope.filters.financialYearId
                ? `&financialYearId=${scope.filters.financialYearId}`
                : ''
            }${
              scope.filters.projectId
                ? `&projectId=${scope.filters.projectId}`
                : ''
            }`,
          },
        ],
      });
    }

    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const periodBalanced =
      this.round2(totalPeriodDebit) === this.round2(totalPeriodCredit);
    const closingBalanced =
      this.round2(totalClosingDebit) === this.round2(totalClosingCredit);
    const notes: string[] = [];
    if (!periodBalanced) {
      notes.push('Period debit and credit totals do not match');
    }
    if (!closingBalanced) {
      notes.push('Closing debit and credit totals do not match');
    }

    return {
      meta: this.meta(
        AccountingReportType.TrialBalance,
        scope,
        periodBalanced && closingBalanced,
        notes,
      ),
      rows,
      totals: {
        openingDebit: this.round2(totalOpeningDebit),
        openingCredit: this.round2(totalOpeningCredit),
        periodDebit: this.round2(totalPeriodDebit),
        periodCredit: this.round2(totalPeriodCredit),
        closingDebit: this.round2(totalClosingDebit),
        closingCredit: this.round2(totalClosingCredit),
      },
    };
  }

  private async generalLedger(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    const lines = await this.loadFlatLines(scope);
    return this.toLedgerPayload(
      AccountingReportType.GeneralLedger,
      scope,
      lines,
    );
  }

  private async cashOrBankBook(
    scope: ReportScope,
    kind: 'cash' | 'bank',
  ): Promise<AccountingReportPayload> {
    const categories =
      kind === 'cash'
        ? [AccountCategory.Cash, AccountCategory.PettyCash]
        : [AccountCategory.Bank];
    const reportType =
      kind === 'cash'
        ? AccountingReportType.CashBook
        : AccountingReportType.BankBook;
    const lines = await this.loadFlatLines(scope, { categories });
    return this.toLedgerPayload(reportType, scope, lines);
  }

  private async toLedgerPayload(
    reportType: AccountingReportType,
    scope: ReportScope,
    lines: FlatLine[],
  ): Promise<AccountingReportPayload> {
    const accounts = await this.accountMap(lines.map((l) => l.accountId));
    let running = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const rows: LedgerLineRow[] = [];

    // Opening balance contribution for filtered accounts
    if (scope.from) {
      const openingOpts: {
        beforeDate: Date;
        accountIds?: Types.ObjectId[];
        categories?: AccountCategory[];
      } = { beforeDate: scope.from };

      if (scope.accountId) {
        openingOpts.accountIds = [scope.accountId];
      } else if (reportType === AccountingReportType.CashBook) {
        openingOpts.categories = [
          AccountCategory.Cash,
          AccountCategory.PettyCash,
        ];
      } else if (reportType === AccountingReportType.BankBook) {
        openingOpts.categories = [AccountCategory.Bank];
      }

      const opening = await this.loadFlatLines(scope, openingOpts);
      running = opening.reduce((s, l) => s + l.debit - l.credit, 0);
    }

    const openingBalance = this.round2(running);

    for (const l of lines) {
      const account = accounts.get(l.accountId);
      running += l.debit - l.credit;
      totalDebit += l.debit;
      totalCredit += l.credit;
      rows.push({
        journalId: l.journalId,
        journalNumber: l.journalNumber,
        journalDate: l.journalDate.toISOString(),
        accountId: l.accountId,
        accountCode: account?.accountCode ?? '',
        accountName: account?.accountName ?? '',
        narration: l.narration,
        description: l.description,
        debit: this.round2(l.debit),
        credit: this.round2(l.credit),
        runningBalance: this.round2(running),
        projectId: l.projectId,
        partyType: l.partyType,
        partyId: l.partyId,
        sourceModule: l.sourceModule,
        sourceEntityType: l.sourceEntityType,
        sourceEntityId: l.sourceEntityId,
        drillDown: this.journalDrill(l),
      });
    }

    const closingBalance = this.round2(running);
    const expectedClosing = this.round2(
      openingBalance + totalDebit - totalCredit,
    );
    const reconciled = closingBalance === expectedClosing;

    return {
      meta: this.meta(
        reportType,
        scope,
        reconciled,
        reconciled
          ? []
          : ['Opening + period movements do not equal closing balance'],
      ),
      openingBalance,
      closingBalance,
      rows,
      totals: {
        debit: this.round2(totalDebit),
        credit: this.round2(totalCredit),
        openingBalance,
        closingBalance,
      },
    };
  }

  private async journalRegister(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    const match = this.baseJournalMatch(scope);
    if (scope.projectId) {
      match.$or = [
        { projectId: scope.projectId },
        { 'lines.projectId': scope.projectId },
      ];
    }

    const journals = await this.journalModel
      .find(match)
      .sort({ journalDate: 1, journalNumber: 1 })
      .lean()
      .exec();

    let totalDebit = 0;
    let totalCredit = 0;
    let unbalanced = 0;
    const rows: JournalRegisterRow[] = journals.map((j) => {
      const debit = this.round2(j.totalDebit ?? 0);
      const credit = this.round2(j.totalCredit ?? 0);
      const balanced = debit === credit;
      if (!balanced) unbalanced += 1;
      totalDebit += debit;
      totalCredit += credit;
      return {
        journalId: String(j._id),
        journalNumber: j.journalNumber,
        journalDate: new Date(j.journalDate).toISOString(),
        narration: j.narration,
        projectId: j.projectId ? String(j.projectId) : null,
        totalDebit: debit,
        totalCredit: credit,
        balanced,
        sourceModule: j.sourceModule ?? null,
        sourceEntityType: j.sourceEntityType ?? null,
        sourceEntityId: j.sourceEntityId ?? null,
        lineCount: j.lines?.length ?? 0,
        drillDown: [
          {
            label: `Journal ${j.journalNumber}`,
            href: `${API}/journals/${String(j._id)}`,
            journalId: String(j._id),
            sourceModule: j.sourceModule,
            sourceEntityType: j.sourceEntityType,
            sourceEntityId: j.sourceEntityId,
          },
        ],
      };
    });

    const registerBalanced =
      this.round2(totalDebit) === this.round2(totalCredit) && unbalanced === 0;

    return {
      meta: this.meta(
        AccountingReportType.JournalRegister,
        scope,
        registerBalanced,
        unbalanced
          ? [`${unbalanced} journal(s) have unequal debit/credit`]
          : [],
      ),
      rows,
      totals: {
        debit: this.round2(totalDebit),
        credit: this.round2(totalCredit),
        journalCount: rows.length,
        unbalancedCount: unbalanced,
      },
    };
  }

  private async projectCostSheet(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    if (!scope.projectId) {
      throw new BadRequestException(
        'projectId is required for project cost sheet',
      );
    }
    const lines = await this.loadFlatLines(scope, {
      accountTypes: [AccountType.Expense],
      categories: undefined,
    });
    // Also include WIP / material / land cost categories
    const wipLines = await this.loadFlatLines(scope, {
      categories: [
        AccountCategory.WorkInProgress,
        AccountCategory.MaterialPurchase,
        AccountCategory.LandCost,
        AccountCategory.DirectExpense,
        AccountCategory.IndirectExpense,
      ],
    });

    const merged = [...lines, ...wipLines];
    const seen = new Set<string>();
    const unique = merged.filter((l) => {
      const key = `${l.journalId}:${l.accountId}:${l.debit}:${l.credit}:${l.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const accounts = await this.accountMap(unique.map((l) => l.accountId));
    const byAccount = new Map<string, number>();
    for (const l of unique) {
      byAccount.set(
        l.accountId,
        (byAccount.get(l.accountId) ?? 0) + l.debit - l.credit,
      );
    }

    const rows: CostSheetRow[] = [];
    let total = 0;
    for (const [accountId, amount] of byAccount) {
      const account = accounts.get(accountId);
      if (!account || amount === 0) continue;
      const amt = this.round2(amount);
      total += amt;
      rows.push({
        accountId,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountCategory: account.accountCategory,
        amount: amt,
        drillDown: [
          {
            label: 'General ledger',
            href: `${API}/accounting-reports/general-ledger?accountId=${accountId}&projectId=${scope.filters.projectId}`,
          },
        ],
      });
    }
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    return {
      meta: this.meta(AccountingReportType.ProjectCostSheet, scope, true),
      rows,
      totals: { cost: this.round2(total) },
    };
  }

  private async projectProfitAndLoss(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    if (!scope.projectId) {
      throw new BadRequestException(
        'projectId is required for project profit and loss',
      );
    }

    const incomeLines = await this.loadFlatLines(scope, {
      accountTypes: [AccountType.Income],
    });
    const expenseLines = await this.loadFlatLines(scope, {
      accountTypes: [AccountType.Expense],
    });

    const buildSection = async (
      section: 'income' | 'expense',
      flat: FlatLine[],
    ): Promise<ProfitAndLossSection> => {
      const accounts = await this.accountMap(flat.map((l) => l.accountId));
      const byAccount = new Map<string, number>();
      for (const l of flat) {
        const signed =
          section === 'income'
            ? l.credit - l.debit
            : l.debit - l.credit;
        byAccount.set(l.accountId, (byAccount.get(l.accountId) ?? 0) + signed);
      }
      const rows: CostSheetRow[] = [];
      let total = 0;
      for (const [accountId, amount] of byAccount) {
        const account = accounts.get(accountId);
        if (!account) continue;
        const amt = this.round2(amount);
        if (amt === 0) continue;
        total += amt;
        rows.push({
          accountId,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountCategory: account.accountCategory,
          amount: amt,
          drillDown: [
            {
              label: 'General ledger',
              href: `${API}/accounting-reports/general-ledger?accountId=${accountId}&projectId=${scope.filters.projectId}`,
            },
          ],
        });
      }
      rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
      return { section, rows, total: this.round2(total) };
    };

    const income = await buildSection('income', incomeLines);
    const expense = await buildSection('expense', expenseLines);
    const netProfit = this.round2(income.total - expense.total);

    return {
      meta: this.meta(
        AccountingReportType.ProjectProfitAndLoss,
        scope,
        true,
        [`Net profit/(loss) = income − expense`],
      ),
      sections: { income, expense },
      totals: {
        income: income.total,
        expense: expense.total,
        netProfit,
      },
    };
  }

  private async partyLedger(
    scope: ReportScope,
    partyType: JournalPartyType,
  ): Promise<AccountingReportPayload> {
    const reportType =
      partyType === JournalPartyType.Vendor
        ? AccountingReportType.VendorLedger
        : partyType === JournalPartyType.Contractor
          ? AccountingReportType.ContractorLedger
          : partyType === JournalPartyType.Director
            ? AccountingReportType.DirectorLedger
            : partyType === JournalPartyType.Investor
              ? AccountingReportType.InvestorLedger
              : AccountingReportType.CustomerLedger;

    const lines = await this.loadFlatLines(scope, {
      partyType,
      partyId: scope.partyId,
    });
    const base = await this.toLedgerPayload(reportType, scope, lines);
    const names = await this.partyNames(
      partyType,
      lines.map((l) => l.partyId).filter(Boolean) as string[],
    );

    const rows: PartyLedgerRow[] = (
      (base.rows as LedgerLineRow[]) ?? []
    ).map((r) => ({
      ...r,
      partyName: r.partyId ? (names.get(r.partyId) ?? null) : null,
    }));

    return { ...base, rows };
  }

  private async customerAdvanceReport(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    const lines = await this.loadFlatLines(scope, {
      categories: [AccountCategory.CustomerAdvance],
      partyType: JournalPartyType.Customer,
    });
    const base = await this.toLedgerPayload(
      AccountingReportType.CustomerAdvanceReport,
      scope,
      lines,
    );
    const names = await this.partyNames(
      JournalPartyType.Customer,
      lines.map((l) => l.partyId).filter(Boolean) as string[],
    );
    const byCustomer = new Map<
      string,
      { partyId: string; partyName: string | null; credit: number; debit: number; balance: number }
    >();
    for (const l of lines) {
      if (!l.partyId) continue;
      const row = byCustomer.get(l.partyId) ?? {
        partyId: l.partyId,
        partyName: names.get(l.partyId) ?? null,
        credit: 0,
        debit: 0,
        balance: 0,
      };
      row.credit += l.credit;
      row.debit += l.debit;
      row.balance = row.credit - row.debit;
      byCustomer.set(l.partyId, row);
    }

    const customerSummaries = [...byCustomer.values()].map((r) => ({
      ...r,
      credit: this.round2(r.credit),
      debit: this.round2(r.debit),
      balance: this.round2(r.balance),
      drillDown: [
        {
          label: 'Customer ledger',
          href: `${API}/accounting-reports/customer-ledger?partyId=${r.partyId}`,
        },
      ] as DrillDownLink[],
    }));

    const totalAdvance = this.round2(
      customerSummaries.reduce((s, r) => s + r.balance, 0),
    );

    return {
      ...base,
      customerSummaries,
      totals: {
        ...(base.totals as Record<string, number>),
        customerAdvanceBalance: totalAdvance,
      },
    };
  }

  private async accountsPayableAgeing(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    const asOf = scope.to ?? new Date();
    const projectFilter = scope.projectId
      ? { $in: [scope.projectId] }
      : undefined;

    const vendorFilter: FilterQuery<VendorInvoice> = {
      status: {
        $nin: [VendorInvoiceStatus.Paid, VendorInvoiceStatus.Cancelled],
      },
    };
    if (projectFilter) vendorFilter.projectId = projectFilter;

    const vendorInvoices = await this.vendorInvoiceModel
      .find(vendorFilter)
      .select('vendorId dueDate totalAmount tds retention paidAmount projectId')
      .lean()
      .exec();

    const contractorFilter: FilterQuery<ContractorBill> = {
      status: {
        $in: [
          ContractorBillStatus.Posted,
          ContractorBillStatus.DirectorApproved,
          ContractorBillStatus.FinanceVerified,
          ContractorBillStatus.PmCertified,
        ],
      },
    };
    if (projectFilter) contractorFilter.projectId = projectFilter;

    const contractorBills = await this.contractorBillModel
      .find(contractorFilter)
      .select(
        'contractorId netPayable paidAmount postedAt directorApprovedAt projectId',
      )
      .lean()
      .exec();

    const vendorNames = await this.partyNames(
      JournalPartyType.Vendor,
      vendorInvoices.map((v) => String(v.vendorId)),
    );
    const contractorNames = await this.partyNames(
      JournalPartyType.Contractor,
      contractorBills.map((c) => String(c.contractorId)),
    );

    const byParty = new Map<string, AgeingBucketRow>();

    const ensure = (
      partyId: string,
      partyType: 'vendor' | 'contractor',
      partyName: string | null,
    ) => {
      const key = `${partyType}:${partyId}`;
      if (!byParty.has(key)) {
        byParty.set(key, {
          partyId,
          partyName,
          partyType,
          current: 0,
          d0_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90Plus: 0,
          total: 0,
          drillDown: [
            {
              label:
                partyType === 'vendor' ? 'Vendor ledger' : 'Contractor ledger',
              href: `${API}/accounting-reports/${partyType}-ledger?partyId=${partyId}`,
            },
          ],
        });
      }
      return byParty.get(key)!;
    };

    for (const inv of vendorInvoices) {
      const remaining = this.round2(
        (inv.totalAmount ?? 0) -
          (inv.tds ?? 0) -
          (inv.retention ?? 0) -
          (inv.paidAmount ?? 0),
      );
      if (remaining <= 0) continue;
      const row = ensure(
        String(inv.vendorId),
        'vendor',
        vendorNames.get(String(inv.vendorId)) ?? null,
      );
      this.addAgeing(row, inv.dueDate, remaining, asOf);
    }

    for (const bill of contractorBills) {
      const remaining = this.round2(
        (bill.netPayable ?? 0) - (bill.paidAmount ?? 0),
      );
      if (remaining <= 0) continue;
      const row = ensure(
        String(bill.contractorId),
        'contractor',
        contractorNames.get(String(bill.contractorId)) ?? null,
      );
      this.addAgeing(
        row,
        bill.postedAt ?? bill.directorApprovedAt ?? null,
        remaining,
        asOf,
      );
    }

    const rows = [...byParty.values()].map((r) => ({
      ...r,
      current: this.round2(r.current),
      d0_30: this.round2(r.d0_30),
      d31_60: this.round2(r.d31_60),
      d61_90: this.round2(r.d61_90),
      d90Plus: this.round2(r.d90Plus),
      total: this.round2(r.total),
    }));
    rows.sort((a, b) => b.total - a.total);

    const totals = rows.reduce(
      (acc, r) => {
        acc.current += r.current;
        acc.d0_30 += r.d0_30;
        acc.d31_60 += r.d31_60;
        acc.d61_90 += r.d61_90;
        acc.d90Plus += r.d90Plus;
        acc.total += r.total;
        return acc;
      },
      { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90Plus: 0, total: 0 },
    );

    const bucketSum =
      totals.current +
      totals.d0_30 +
      totals.d31_60 +
      totals.d61_90 +
      totals.d90Plus;
    const reconciled = this.round2(bucketSum) === this.round2(totals.total);

    return {
      meta: this.meta(
        AccountingReportType.AccountsPayableAgeing,
        scope,
        reconciled,
        reconciled ? [] : ['Ageing bucket sum does not equal total'],
      ),
      rows,
      totals: {
        current: this.round2(totals.current),
        d0_30: this.round2(totals.d0_30),
        d31_60: this.round2(totals.d31_60),
        d61_90: this.round2(totals.d61_90),
        d90Plus: this.round2(totals.d90Plus),
        total: this.round2(totals.total),
      },
    };
  }

  private async accountsReceivableAgeing(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    const asOf = scope.to ?? new Date();
    const match: FilterQuery<PaymentSchedule> = {
      status: PaymentScheduleStatus.Active,
    };
    if (scope.projectId) match.projectId = scope.projectId;

    const schedules = await this.paymentScheduleModel
      .find(match)
      .select('customerId projectId lines')
      .lean()
      .exec();

    const customerIds = schedules.map((s) => String(s.customerId));
    const names = await this.partyNames(JournalPartyType.Customer, customerIds);
    const byParty = new Map<string, AgeingBucketRow>();

    for (const schedule of schedules) {
      const partyId = String(schedule.customerId);
      if (!byParty.has(partyId)) {
        byParty.set(partyId, {
          partyId,
          partyName: names.get(partyId) ?? null,
          partyType: 'customer',
          current: 0,
          d0_30: 0,
          d31_60: 0,
          d61_90: 0,
          d90Plus: 0,
          total: 0,
          drillDown: [
            {
              label: 'Customer ledger',
              href: `${API}/accounting-reports/customer-ledger?partyId=${partyId}`,
            },
          ],
        });
      }
      const row = byParty.get(partyId)!;
      for (const line of schedule.lines ?? []) {
        if (
          ![
            PaymentScheduleLineStatus.Pending,
            PaymentScheduleLineStatus.Due,
            PaymentScheduleLineStatus.Demanded,
            PaymentScheduleLineStatus.Overdue,
          ].includes(line.status)
        ) {
          continue;
        }
        const remaining = this.round2(
          (line.amount ?? 0) +
            (line.tax ?? 0) -
            (line.collectedAmount ?? 0),
        );
        if (remaining <= 0) continue;
        this.addAgeing(row, line.dueDate, remaining, asOf);
      }
    }

    const rows = [...byParty.values()]
      .map((r) => ({
        ...r,
        current: this.round2(r.current),
        d0_30: this.round2(r.d0_30),
        d31_60: this.round2(r.d31_60),
        d61_90: this.round2(r.d61_90),
        d90Plus: this.round2(r.d90Plus),
        total: this.round2(r.total),
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    const totals = rows.reduce(
      (acc, r) => {
        acc.current += r.current;
        acc.d0_30 += r.d0_30;
        acc.d31_60 += r.d31_60;
        acc.d61_90 += r.d61_90;
        acc.d90Plus += r.d90Plus;
        acc.total += r.total;
        return acc;
      },
      { current: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90Plus: 0, total: 0 },
    );

    const bucketSum =
      totals.current +
      totals.d0_30 +
      totals.d31_60 +
      totals.d61_90 +
      totals.d90Plus;

    return {
      meta: this.meta(
        AccountingReportType.AccountsReceivableAgeing,
        scope,
        this.round2(bucketSum) === this.round2(totals.total),
      ),
      rows,
      totals: {
        current: this.round2(totals.current),
        d0_30: this.round2(totals.d0_30),
        d31_60: this.round2(totals.d31_60),
        d61_90: this.round2(totals.d61_90),
        d90Plus: this.round2(totals.d90Plus),
        total: this.round2(totals.total),
      },
    };
  }

  private async sourceAndUtilisation(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    const lines = await this.loadFlatLines(scope);
    const accounts = await this.accountMap(lines.map((l) => l.accountId));

    const sources = new Map<string, number>();
    const utilisations = new Map<string, number>();

    for (const l of lines) {
      const account = accounts.get(l.accountId);
      if (!account) continue;
      const cat = account.accountCategory;
      // Sources: credits to funding / liability / equity / advances
      if (
        [
          AccountCategory.DirectorAccount,
          AccountCategory.InvestorAccount,
          AccountCategory.Loan,
          AccountCategory.CustomerAdvance,
          AccountCategory.OtherIncome,
          AccountCategory.Sales,
        ].includes(cat)
      ) {
        const amt = l.credit - l.debit;
        if (amt > 0) {
          sources.set(cat, (sources.get(cat) ?? 0) + amt);
        }
      }
      // Utilisation: net debit to cost / WIP / expenses / payables settlement proxies
      if (
        [
          AccountCategory.WorkInProgress,
          AccountCategory.MaterialPurchase,
          AccountCategory.LandCost,
          AccountCategory.DirectExpense,
          AccountCategory.IndirectExpense,
          AccountCategory.VendorPayable,
          AccountCategory.ContractorPayable,
        ].includes(cat)
      ) {
        const amt = l.debit - l.credit;
        if (amt > 0) {
          utilisations.set(cat, (utilisations.get(cat) ?? 0) + amt);
        }
      }
    }

    const toLines = (map: Map<string, number>, kind: 'source' | 'utilisation') =>
      [...map.entries()]
        .map(
          ([category, amount]): FundLine => ({
            label: category,
            amount: this.round2(amount),
            accountCategory: category,
            drillDown: [
              {
                label:
                  kind === 'source'
                    ? 'Source movements'
                    : 'Utilisation movements',
                href: `${API}/accounting-reports/general-ledger`,
              },
            ],
          }),
        )
        .sort((a, b) => b.amount - a.amount);

    const sourceLines = toLines(sources, 'source');
    const utilisationLines = toLines(utilisations, 'utilisation');
    const totalSources = this.round2(
      sourceLines.reduce((s, r) => s + r.amount, 0),
    );
    const totalUtilisation = this.round2(
      utilisationLines.reduce((s, r) => s + r.amount, 0),
    );

    return {
      meta: this.meta(
        AccountingReportType.SourceAndUtilisationOfFunds,
        scope,
        true,
        [
          'Sources and utilisation are classified from posted journal categories; difference is surplus/(deficit).',
        ],
      ),
      sections: {
        sources: sourceLines,
        utilisation: utilisationLines,
      },
      totals: {
        sources: totalSources,
        utilisation: totalUtilisation,
        surplusDeficit: this.round2(totalSources - totalUtilisation),
      },
    };
  }

  private async cashFlow(scope: ReportScope): Promise<AccountingReportPayload> {
    const lines = await this.loadFlatLines(scope, {
      categories: [
        AccountCategory.Bank,
        AccountCategory.Cash,
        AccountCategory.PettyCash,
      ],
    });
    const accounts = await this.accountMap(lines.map((l) => l.accountId));

    let operatingIn = 0;
    let operatingOut = 0;
    let financingIn = 0;
    let financingOut = 0;
    let investingOut = 0;

    for (const l of lines) {
      const net = l.debit - l.credit; // positive = cash in for asset accounts
      if (net === 0) continue;
      const party = l.partyType;
      const module = l.sourceModule ?? '';
      if (
        party === JournalPartyType.Customer ||
        module.includes('customer') ||
        module.includes('receipt')
      ) {
        if (net > 0) operatingIn += net;
        else operatingOut += -net;
      } else if (
        party === JournalPartyType.Director ||
        party === JournalPartyType.Investor ||
        module.includes('contribution')
      ) {
        if (net > 0) financingIn += net;
        else financingOut += -net;
      } else if (
        party === JournalPartyType.Vendor ||
        party === JournalPartyType.Contractor ||
        module.includes('payment') ||
        module.includes('expense')
      ) {
        if (net < 0) operatingOut += -net;
        else operatingIn += net;
      } else if (net < 0) {
        investingOut += -net;
      } else {
        operatingIn += net;
      }
      void accounts;
    }

    const netChange = this.round2(
      operatingIn -
        operatingOut +
        financingIn -
        financingOut -
        investingOut,
    );
    const bookNet = this.round2(
      lines.reduce((s, l) => s + l.debit - l.credit, 0),
    );

    return {
      meta: this.meta(
        AccountingReportType.CashFlow,
        scope,
        this.round2(Math.abs(netChange - bookNet)) < 0.02,
        [
          'Cash flow classified from bank/cash journal lines by party and source module.',
        ],
      ),
      sections: {
        operating: {
          inflows: this.round2(operatingIn),
          outflows: this.round2(operatingOut),
          net: this.round2(operatingIn - operatingOut),
        },
        financing: {
          inflows: this.round2(financingIn),
          outflows: this.round2(financingOut),
          net: this.round2(financingIn - financingOut),
        },
        investing: {
          inflows: 0,
          outflows: this.round2(investingOut),
          net: this.round2(-investingOut),
        },
      },
      totals: {
        netChange,
        bookNetMovement: bookNet,
      },
      rows: lines.slice(0, 200).map((l) => ({
        ...l,
        journalDate: l.journalDate.toISOString(),
        drillDown: this.journalDrill(l),
      })),
    };
  }

  private async projectFundFlow(
    scope: ReportScope,
  ): Promise<AccountingReportPayload> {
    if (!scope.projectId) {
      throw new BadRequestException(
        'projectId is required for project fund flow',
      );
    }

    const cashBankLines = await this.loadFlatLines(scope, {
      categories: [
        AccountCategory.Bank,
        AccountCategory.Cash,
        AccountCategory.PettyCash,
      ],
    });
    const openingLines = scope.from
      ? await this.loadFlatLines(scope, {
          beforeDate: scope.from,
          categories: [
            AccountCategory.Bank,
            AccountCategory.Cash,
            AccountCategory.PettyCash,
          ],
        })
      : [];

    const opening = this.round2(
      openingLines.reduce((s, l) => s + l.debit - l.credit, 0),
    );

    let inflows = 0;
    let outflows = 0;
    for (const l of cashBankLines) {
      const net = l.debit - l.credit;
      if (net > 0) inflows += net;
      else outflows += -net;
    }
    inflows = this.round2(inflows);
    outflows = this.round2(outflows);
    const closing = this.round2(opening + inflows - outflows);
    const bookClosing = this.round2(
      opening +
        cashBankLines.reduce((s, l) => s + l.debit - l.credit, 0),
    );

    return {
      meta: this.meta(
        AccountingReportType.ProjectFundFlow,
        scope,
        closing === bookClosing,
      ),
      sections: {
        openingBalance: opening,
        inflows,
        outflows,
        closingBalance: closing,
      },
      totals: {
        opening,
        inflows,
        outflows,
        closing,
      },
      rows: cashBankLines.map((l) => ({
        journalId: l.journalId,
        journalNumber: l.journalNumber,
        journalDate: l.journalDate.toISOString(),
        narration: l.narration,
        debit: this.round2(l.debit),
        credit: this.round2(l.credit),
        net: this.round2(l.debit - l.credit),
        drillDown: this.journalDrill(l),
      })),
    };
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  private async partyNames(
    partyType: JournalPartyType,
    ids: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id) => Types.ObjectId.isValid(id)))];
    const map = new Map<string, string>();
    if (!unique.length) return map;
    const oids = unique.map((id) => new Types.ObjectId(id));

    switch (partyType) {
      case JournalPartyType.Vendor: {
        const rows = await this.vendorModel
          .find({ _id: { $in: oids } })
          .select('tradeName vendorCode')
          .lean()
          .exec();
        for (const r of rows) {
          map.set(String(r._id), r.tradeName ?? r.vendorCode ?? String(r._id));
        }
        break;
      }
      case JournalPartyType.Contractor: {
        const rows = await this.contractorModel
          .find({ _id: { $in: oids } })
          .select('tradeName contractorCode')
          .lean()
          .exec();
        for (const r of rows) {
          map.set(
            String(r._id),
            r.tradeName ?? r.contractorCode ?? String(r._id),
          );
        }
        break;
      }
      case JournalPartyType.Customer: {
        const rows = await this.customerModel
          .find({ _id: { $in: oids } })
          .select('fullName customerCode')
          .lean()
          .exec();
        for (const r of rows) {
          map.set(
            String(r._id),
            r.fullName ?? r.customerCode ?? String(r._id),
          );
        }
        break;
      }
      case JournalPartyType.Director: {
        const rows = await this.directorModel
          .find({ _id: { $in: oids } })
          .select('fullName directorCode')
          .lean()
          .exec();
        for (const r of rows) {
          map.set(
            String(r._id),
            r.fullName ?? r.directorCode ?? String(r._id),
          );
        }
        break;
      }
      case JournalPartyType.Investor: {
        const rows = await this.investorModel
          .find({ _id: { $in: oids } })
          .select('legalName investorCode')
          .lean()
          .exec();
        for (const r of rows) {
          map.set(
            String(r._id),
            r.legalName ?? r.investorCode ?? String(r._id),
          );
        }
        break;
      }
      default:
        break;
    }
    return map;
  }

  private addAgeing(
    row: AgeingBucketRow,
    dueOrAnchor: Date | null | undefined,
    amount: number,
    asOf: Date,
  ) {
    row.total = this.round2(row.total + amount);
    if (!dueOrAnchor) {
      row.d90Plus = this.round2(row.d90Plus + amount);
      return;
    }
    const due = new Date(dueOrAnchor);
    const days = Math.floor(
      (asOf.getTime() - this.startOfUtcDay(due).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (days < 0) row.current = this.round2(row.current + amount);
    else if (days <= 30) row.d0_30 = this.round2(row.d0_30 + amount);
    else if (days <= 60) row.d31_60 = this.round2(row.d31_60 + amount);
    else if (days <= 90) row.d61_90 = this.round2(row.d61_90 + amount);
    else row.d90Plus = this.round2(row.d90Plus + amount);
  }

  private startOfUtcDay(d: Date): Date {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
