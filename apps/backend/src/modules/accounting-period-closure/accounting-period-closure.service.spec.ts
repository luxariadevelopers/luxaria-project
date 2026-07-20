import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  AuditAction,
  AuditLog,
  AuditLogSchema,
} from '../audit-log/schemas/audit-log.schema';
import {
  BankReconciliationSessionStatus,
} from '../bank-reconciliation/bank-reconciliation.constants';
import {
  BankReconciliationSession,
  BankReconciliationSessionSchema,
} from '../bank-reconciliation/schemas/bank-reconciliation-session.schema';
import {
  CashAccount,
  CashAccountKind,
  CashAccountSchema,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  Company,
  CompanySchema,
  CompanyStatus,
} from '../company/schemas/company.schema';
import {
  FinancialYear,
  FinancialYearSchema,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  MaterialConsumptionReport,
  MaterialConsumptionReportSchema,
} from '../material-consumption/schemas/material-consumption-report.schema';
import {
  SiteExpenseVoucher,
  SiteExpenseVoucherSchema,
} from '../site-expense-vouchers/schemas/site-expense-voucher.schema';
import {
  StockCount,
  StockCountSchema,
} from '../stock-counts/schemas/stock-count.schema';
import {
  VendorInvoice,
  VendorInvoiceSchema,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  AccountingPeriodStatus,
  AccountingPeriodType,
  PeriodChecklistItemKey,
  PeriodChecklistItemStatus,
} from './accounting-period-closure.constants';
import { AccountingPeriodClosureService } from './accounting-period-closure.service';
import { AccountingPeriodValidationService } from './accounting-period-validation.service';
import {
  AccountingPeriod,
  AccountingPeriodSchema,
} from './schemas/accounting-period.schema';
import {
  PeriodReopenRequest,
  PeriodReopenRequestSchema,
} from './schemas/period-reopen-request.schema';

describe('AccountingPeriodClosureService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let periodModel: Model<AccountingPeriod>;
  let reopenModel: Model<PeriodReopenRequest>;
  let fyModel: Model<FinancialYear>;
  let journalModel: Model<JournalEntry>;
  let bankReconModel: Model<BankReconciliationSession>;
  let cashModel: Model<CashAccount>;
  let accountModel: Model<Account>;
  let auditModel: Model<AuditLog>;
  let service: AccountingPeriodClosureService;

  let fyId: string;
  let bankLedgerId: Types.ObjectId;
  let cashLedgerId: Types.ObjectId;
  const actorId = new Types.ObjectId().toHexString();
  const approverId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    periodModel = connection.model(
      AccountingPeriod.name,
      AccountingPeriodSchema,
    ) as Model<AccountingPeriod>;
    reopenModel = connection.model(
      PeriodReopenRequest.name,
      PeriodReopenRequestSchema,
    ) as Model<PeriodReopenRequest>;
    fyModel = connection.model(
      FinancialYear.name,
      FinancialYearSchema,
    ) as Model<FinancialYear>;
    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    bankReconModel = connection.model(
      BankReconciliationSession.name,
      BankReconciliationSessionSchema,
    ) as Model<BankReconciliationSession>;
    cashModel = connection.model(
      CashAccount.name,
      CashAccountSchema,
    ) as Model<CashAccount>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    auditModel = connection.model(
      AuditLog.name,
      AuditLogSchema,
    ) as Model<AuditLog>;

    connection.model(Company.name, CompanySchema);
    connection.model(SiteExpenseVoucher.name, SiteExpenseVoucherSchema);
    connection.model(VendorInvoice.name, VendorInvoiceSchema);
    connection.model(StockCount.name, StockCountSchema);
    connection.model(
      MaterialConsumptionReport.name,
      MaterialConsumptionReportSchema,
    );

    await Promise.all([
      periodModel.syncIndexes(),
      reopenModel.syncIndexes(),
      fyModel.syncIndexes(),
      journalModel.syncIndexes(),
      bankReconModel.syncIndexes(),
      cashModel.syncIndexes(),
      accountModel.syncIndexes(),
      auditModel.syncIndexes(),
    ]);

    const validation = new AccountingPeriodValidationService(
      journalModel,
      bankReconModel,
      cashModel,
      connection.model(SiteExpenseVoucher.name) as Model<SiteExpenseVoucher>,
      connection.model(VendorInvoice.name) as Model<VendorInvoice>,
      connection.model(StockCount.name) as Model<StockCount>,
      connection.model(
        MaterialConsumptionReport.name,
      ) as Model<MaterialConsumptionReport>,
    );

    service = new AccountingPeriodClosureService(
      periodModel,
      reopenModel,
      fyModel,
      validation,
      new AuditLogService(auditModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      periodModel.deleteMany({}).setOptions({ withDeleted: true }),
      reopenModel.deleteMany({}).setOptions({ withDeleted: true }),
      fyModel.deleteMany({}).setOptions({ withDeleted: true }),
      journalModel.deleteMany({}).setOptions({ withDeleted: true }),
      bankReconModel.deleteMany({}).setOptions({ withDeleted: true }),
      cashModel.deleteMany({}).setOptions({ withDeleted: true }),
      accountModel.deleteMany({}).setOptions({ withDeleted: true }),
      connection
        .model(SiteExpenseVoucher.name)
        .deleteMany({})
        .setOptions({ withDeleted: true }),
      connection
        .model(VendorInvoice.name)
        .deleteMany({})
        .setOptions({ withDeleted: true }),
      connection
        .model(StockCount.name)
        .deleteMany({})
        .setOptions({ withDeleted: true }),
      connection
        .model(MaterialConsumptionReport.name)
        .deleteMany({})
        .setOptions({ withDeleted: true }),
      auditModel.collection.deleteMany({}),
    ]);

    await connection.model(Company.name).deleteMany({}).setOptions({
      withDeleted: true,
    });
    await connection.model(Company.name).create({
      companyCode: 'CMP-0001',
      legalName: 'Luxaria Developers Pvt. Ltd.',
      tradeName: 'Luxaria',
      registeredAddress: {
        line1: 'Office',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      corporateAddress: {
        line1: 'Office',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      authorisedShareCapital: 10_000_000,
      paidUpShareCapital: 0,
      financialYearStartMonth: 4,
      status: CompanyStatus.Active,
      isPrimary: true,
    });

    const [fy] = await fyModel.create([
      {
        companyId: null,
        name: 'FY 2026-27',
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        endDate: new Date('2027-03-31T23:59:59.999Z'),
        status: FinancialYearStatus.Open,
        isCurrent: true,
        isLocked: false,
      },
    ]);
    fyId = String(fy._id);

    const [bank, cash] = await accountModel.create([
      {
        accountCode: '1110',
        accountName: 'Bank',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        level: 1,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: false,
        requiresParty: false,
        postingCount: 0,
        status: AccountStatus.Active,
      },
      {
        accountCode: '1120',
        accountName: 'Cash',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Cash,
        level: 1,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: false,
        requiresParty: false,
        postingCount: 0,
        status: AccountStatus.Active,
      },
    ]);
    bankLedgerId = bank._id as Types.ObjectId;
    cashLedgerId = cash._id as Types.ObjectId;
  });

  async function createJuly() {
    const res = await service.createPeriod(
      {
        periodType: AccountingPeriodType.Monthly,
        financialYearId: fyId,
        month: 7,
        year: 2026,
      },
      actorId,
    );
    return res.data as { id: string };
  }

  it('creates monthly and financial-year periods with pending checklist', async () => {
    const monthly = await createJuly();
    const fyPeriod = await service.createPeriod(
      {
        periodType: AccountingPeriodType.FinancialYear,
        financialYearId: fyId,
      },
      actorId,
    );

    expect(monthly.id).toBeTruthy();
    expect((fyPeriod.data as { periodType: string }).periodType).toBe(
      AccountingPeriodType.FinancialYear,
    );

    const checklist = await service.getChecklist(monthly.id);
    const items = (checklist.data as { checklist: Array<{ status: string }> })
      .checklist;
    expect(items).toHaveLength(7);
    expect(items.every((i) => i.status === PeriodChecklistItemStatus.Pending)).toBe(
      true,
    );
  });

  it('fails pre-close validation for unposted journals and pending bank recon', async () => {
    const period = await createJuly();

    await journalModel.create({
      journalNumber: 'JV-DRAFT-1',
      journalDate: new Date('2026-07-10'),
      financialYearId: new Types.ObjectId(fyId),
      narration: 'Unposted',
      status: JournalStatus.Draft,
      totalDebit: 100,
      totalCredit: 100,
      lines: [
        { accountId: bankLedgerId, debit: 100, credit: 0 },
        { accountId: cashLedgerId, debit: 0, credit: 100 },
      ],
    });

    await bankReconModel.create({
      sessionNumber: 'BR-TEST01',
      bankAccountId: new Types.ObjectId(),
      ledgerAccountId: bankLedgerId,
      statementFrom: new Date('2026-07-01'),
      statementTo: new Date('2026-07-31'),
      statementOpeningBalance: 0,
      statementClosingBalance: 0,
      status: BankReconciliationSessionStatus.InProgress,
      createdBy: new Types.ObjectId(actorId),
    });

    const result = await service.runPreCloseValidation(period.id, actorId);
    const data = result.data as {
      validationPassed: boolean;
      checklist: Array<{ key: string; status: string; issueCount: number }>;
    };

    expect(data.validationPassed).toBe(false);
    const journals = data.checklist.find(
      (c) => c.key === PeriodChecklistItemKey.UnpostedJournals,
    );
    const recon = data.checklist.find(
      (c) => c.key === PeriodChecklistItemKey.PendingBankReconciliation,
    );
    expect(journals?.status).toBe(PeriodChecklistItemStatus.Failed);
    expect(journals?.issueCount).toBeGreaterThan(0);
    expect(recon?.status).toBe(PeriodChecklistItemStatus.Failed);

    await expect(service.lockPeriod(period.id, actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const audits = await auditModel
      .find({ entityType: 'accounting_period_validation' })
      .lean();
    expect(audits).toHaveLength(1);
  });

  it('detects negative cash balance', async () => {
    const period = await createJuly();
    await cashModel.create({
      accountCode: 'CA-001',
      accountName: 'Site Cash',
      kind: CashAccountKind.SiteCash,
      projectId: new Types.ObjectId(),
      ledgerAccountId: cashLedgerId,
      custodianUserId: new Types.ObjectId(actorId),
      openingBalance: 100,
      maximumHoldingLimit: 50_000,
      replenishmentLevel: 5_000,
      status: CashAccountStatus.Active,
    });

    await journalModel.create({
      journalNumber: 'JV-CASH-1',
      journalDate: new Date('2026-07-05'),
      financialYearId: new Types.ObjectId(fyId),
      narration: 'Overspend',
      status: JournalStatus.Posted,
      totalDebit: 500,
      totalCredit: 500,
      postedAt: new Date('2026-07-05'),
      postedBy: new Types.ObjectId(actorId),
      lines: [
        { accountId: bankLedgerId, debit: 500, credit: 0 },
        { accountId: cashLedgerId, debit: 0, credit: 500 },
      ],
    });

    const result = await service.runPreCloseValidation(period.id, actorId);
    const cashItem = (
      result.data as {
        checklist: Array<{ key: string; status: string }>;
      }
    ).checklist.find((c) => c.key === PeriodChecklistItemKey.NegativeCashBalance);

    expect(cashItem?.status).toBe(PeriodChecklistItemStatus.Failed);
  });

  it('locks, closes, and reopens with approval; blocks self-approval', async () => {
    const period = await createJuly();
    const validated = await service.runPreCloseValidation(period.id, actorId);
    expect((validated.data as { validationPassed: boolean }).validationPassed).toBe(
      true,
    );

    const locked = await service.lockPeriod(period.id, actorId);
    expect((locked.data as { status: string }).status).toBe(
      AccountingPeriodStatus.Locked,
    );

    const closed = await service.closePeriod(period.id, actorId);
    expect((closed.data as { status: string }).status).toBe(
      AccountingPeriodStatus.Closed,
    );

    const request = await service.requestReopen(
      period.id,
      { reason: 'Need to post late bank charge for July' },
      actorId,
    );
    const requestId = (request.data as { id: string }).id;

    await expect(
      service.approveReopen(period.id, requestId, {}, actorId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const approved = await service.approveReopen(
      period.id,
      requestId,
      { approvalNote: 'Approved for correction' },
      approverId,
    );
    expect((approved.data as { period: { status: string } }).period.status).toBe(
      AccountingPeriodStatus.Open,
    );

    const reopenAudits = await auditModel
      .find({
        module: 'accounting_period_closure',
        action: AuditAction.APPROVE,
      })
      .lean();
    expect(reopenAudits.length).toBeGreaterThanOrEqual(1);
  });

  it('syncs financial year lock when locking FY period', async () => {
    const created = await service.createPeriod(
      {
        periodType: AccountingPeriodType.FinancialYear,
        financialYearId: fyId,
      },
      actorId,
    );
    const periodId = (created.data as { id: string }).id;
    await service.runPreCloseValidation(periodId, actorId);
    await service.lockPeriod(periodId, actorId);

    const fy = await fyModel.findById(fyId).lean();
    expect(fy?.isLocked).toBe(true);
    expect(fy?.status).toBe(FinancialYearStatus.Locked);
  });
});
