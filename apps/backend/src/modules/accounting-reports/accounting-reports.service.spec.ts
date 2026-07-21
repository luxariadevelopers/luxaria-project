import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  ContractorBill,
  ContractorBillSchema,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
} from '../contractors/schemas/contractor.schema';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema';
import {
  Director,
  DirectorSchema,
} from '../directors/schemas/director.schema';
import {
  FinancialYear,
  FinancialYearSchema,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import {
  Investor,
  InvestorSchema,
} from '../investors/schemas/investor.schema';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalPartyType,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleSchema,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from '../payment-schedules/schemas/payment-schedule.schema';
import {
  Project,
  ProjectSchema,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceSchema,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import { Vendor, VendorSchema } from '../vendors/schemas/vendor.schema';
import { AccountingReportsExportService } from './accounting-reports-export.service';
import { AccountingReportType } from './accounting-reports.constants';
import { AccountingReportsService } from './accounting-reports.service';

describe('AccountingReportsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: AccountingReportsService;
  let exportService: AccountingReportsExportService;

  let fyId: string;
  let projectId: string;
  let actorId: string;
  let bankId: string;
  let cashId: string;
  let expenseId: string;
  let incomeId: string;
  let vendorPayableId: string;
  let customerAdvanceId: string;
  let vendorId: Types.ObjectId;
  let customerId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    const accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const fyModel = connection.model(
      FinancialYear.name,
      FinancialYearSchema,
    ) as Model<FinancialYear>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const vendorInvoiceModel = connection.model(
      VendorInvoice.name,
      VendorInvoiceSchema,
    ) as Model<VendorInvoice>;
    const contractorBillModel = connection.model(
      ContractorBill.name,
      ContractorBillSchema,
    ) as Model<ContractorBill>;
    const paymentScheduleModel = connection.model(
      PaymentSchedule.name,
      PaymentScheduleSchema,
    ) as Model<PaymentSchedule>;
    const vendorModel = connection.model(
      Vendor.name,
      VendorSchema,
    ) as Model<Vendor>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const customerModel = connection.model(
      Customer.name,
      CustomerSchema,
    ) as Model<Customer>;
    const directorModel = connection.model(
      Director.name,
      DirectorSchema,
    ) as Model<Director>;
    const investorModel = connection.model(
      Investor.name,
      InvestorSchema,
    ) as Model<Investor>;

    service = new AccountingReportsService(
      journalModel,
      accountModel,
      fyModel,
      projectModel,
      vendorInvoiceModel,
      contractorBillModel,
      paymentScheduleModel,
      vendorModel,
      contractorModel,
      customerModel,
      directorModel,
      investorModel,
      {
        assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
        assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
        assertOwnedResource: jest.fn().mockResolvedValue(undefined),
        mergeAuthorisedProjectFilter: jest
          .fn()
          .mockImplementation(async (_a, f) => f),
        findOneForActor: jest.fn(),
        buildScopedIdFilter: jest.fn(),
        authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
      } as never,
    );
    exportService = new AccountingReportsExportService(service);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    const fy = await connection.model(FinancialYear.name).create({
      companyId: new Types.ObjectId(),
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      status: FinancialYearStatus.Open,
      isCurrent: true,
      isLocked: false,
    });
    fyId = String(fy._id);

    const project = await connection.model(Project.name).create({
      projectCode: 'PRJ-RPT',
      projectName: 'Report Towers',
      projectType: ProjectType.Residential,
      address: {
        line1: '1 Report Road',
        city: 'Chennai',
        state: 'TN',
        pincode: '600001',
        country: 'India',
      },
    });
    projectId = String(project._id);
    actorId = new Types.ObjectId().toHexString();

    const [bank, cash, expense, income, vendorPayable, customerAdvance] =
      await connection.model(Account.name).create([
        {
          accountCode: '1110',
          accountName: 'Bank',
          accountType: AccountType.Asset,
          accountCategory: AccountCategory.Bank,
          level: 1,
        },
        {
          accountCode: '1120',
          accountName: 'Cash',
          accountType: AccountType.Asset,
          accountCategory: AccountCategory.Cash,
          level: 1,
        },
        {
          accountCode: '5100',
          accountName: 'Site Expense',
          accountType: AccountType.Expense,
          accountCategory: AccountCategory.DirectExpense,
          level: 1,
          requiresProject: true,
        },
        {
          accountCode: '4100',
          accountName: 'Sales',
          accountType: AccountType.Income,
          accountCategory: AccountCategory.Sales,
          level: 1,
        },
        {
          accountCode: '2110',
          accountName: 'Vendor Payable',
          accountType: AccountType.Liability,
          accountCategory: AccountCategory.VendorPayable,
          level: 1,
          requiresParty: true,
        },
        {
          accountCode: '2140',
          accountName: 'Customer Advance',
          accountType: AccountType.Liability,
          accountCategory: AccountCategory.CustomerAdvance,
          level: 1,
          requiresParty: true,
        },
      ]);
    bankId = String(bank._id);
    cashId = String(cash._id);
    expenseId = String(expense._id);
    incomeId = String(income._id);
    vendorPayableId = String(vendorPayable._id);
    customerAdvanceId = String(customerAdvance._id);

    vendorId = new Types.ObjectId();
    customerId = new Types.ObjectId();

    await connection.model(Vendor.name).create({
      _id: vendorId,
      vendorCode: 'V-001',
      tradeName: 'Steel Suppliers',
      legalName: 'Steel Suppliers Pvt Ltd',
    });

    // Minimal customer — only required fields that exist
    try {
      await connection.model(Customer.name).create({
        _id: customerId,
        customerCode: 'C-001',
        fullName: 'Buyer One',
      });
    } catch {
      // Customer schema may require more fields; party name lookup optional
    }

    // Opening transfer before FY period start (for opening balance tests)
    await connection.model(JournalEntry.name).create({
      journalNumber: 'JV-OPEN-1',
      journalDate: new Date('2026-03-31T00:00:00.000Z'),
      financialYearId: fy._id,
      narration: 'Opening bank funding',
      status: JournalStatus.Posted,
      totalDebit: 100_000,
      totalCredit: 100_000,
      postedAt: new Date(),
      lines: [
        {
          accountId: bank._id,
          debit: 100_000,
          credit: 0,
          projectId: project._id,
        },
        {
          accountId: customerAdvance._id,
          debit: 0,
          credit: 100_000,
          projectId: project._id,
          partyType: JournalPartyType.Customer,
          partyId: customerId,
        },
      ],
    });

    // Period journals
    await connection.model(JournalEntry.name).create([
      {
        journalNumber: 'JV-001',
        journalDate: new Date('2026-07-10T00:00:00.000Z'),
        financialYearId: fy._id,
        projectId: project._id,
        narration: 'Vendor bill booking',
        status: JournalStatus.Posted,
        totalDebit: 20_000,
        totalCredit: 20_000,
        sourceModule: 'vendor_invoice',
        sourceEntityType: 'vendor_invoice',
        sourceEntityId: new Types.ObjectId().toHexString(),
        postedAt: new Date(),
        lines: [
          {
            accountId: expense._id,
            debit: 20_000,
            credit: 0,
            projectId: project._id,
          },
          {
            accountId: vendorPayable._id,
            debit: 0,
            credit: 20_000,
            projectId: project._id,
            partyType: JournalPartyType.Vendor,
            partyId: vendorId,
          },
        ],
      },
      {
        journalNumber: 'JV-002',
        journalDate: new Date('2026-07-12T00:00:00.000Z'),
        financialYearId: fy._id,
        projectId: project._id,
        narration: 'Pay vendor from bank',
        status: JournalStatus.Posted,
        totalDebit: 15_000,
        totalCredit: 15_000,
        sourceModule: 'vendor_payment',
        sourceEntityType: 'vendor_payment',
        sourceEntityId: new Types.ObjectId().toHexString(),
        postedAt: new Date(),
        lines: [
          {
            accountId: vendorPayable._id,
            debit: 15_000,
            credit: 0,
            projectId: project._id,
            partyType: JournalPartyType.Vendor,
            partyId: vendorId,
          },
          {
            accountId: bank._id,
            debit: 0,
            credit: 15_000,
            projectId: project._id,
          },
        ],
      },
      {
        journalNumber: 'JV-003',
        journalDate: new Date('2026-07-15T00:00:00.000Z'),
        financialYearId: fy._id,
        projectId: project._id,
        narration: 'Customer receipt to bank',
        status: JournalStatus.Posted,
        totalDebit: 50_000,
        totalCredit: 50_000,
        sourceModule: 'customer_receipt',
        sourceEntityType: 'customer_receipt',
        sourceEntityId: new Types.ObjectId().toHexString(),
        postedAt: new Date(),
        lines: [
          {
            accountId: bank._id,
            debit: 50_000,
            credit: 0,
            projectId: project._id,
          },
          {
            accountId: customerAdvance._id,
            debit: 0,
            credit: 50_000,
            projectId: project._id,
            partyType: JournalPartyType.Customer,
            partyId: customerId,
          },
        ],
      },
      {
        journalNumber: 'JV-004',
        journalDate: new Date('2026-07-16T00:00:00.000Z'),
        financialYearId: fy._id,
        projectId: project._id,
        narration: 'Recognise income',
        status: JournalStatus.Posted,
        totalDebit: 10_000,
        totalCredit: 10_000,
        postedAt: new Date(),
        lines: [
          {
            accountId: customerAdvance._id,
            debit: 10_000,
            credit: 0,
            projectId: project._id,
            partyType: JournalPartyType.Customer,
            partyId: customerId,
          },
          {
            accountId: income._id,
            debit: 0,
            credit: 10_000,
            projectId: project._id,
          },
        ],
      },
    ]);

    await connection.model(VendorInvoice.name).create({
      documentNumber: 'VI-2026-000001',
      invoiceNumber: 'V-001',
      vendorId,
      projectId: project._id,
      purchaseOrderId: new Types.ObjectId(),
      invoiceDate: new Date('2026-06-01T00:00:00.000Z'),
      dueDate: new Date('2026-06-15T00:00:00.000Z'),
      taxableValue: 8_000,
      gst: 0,
      tds: 0,
      retention: 0,
      freight: 0,
      discount: 0,
      totalAmount: 8_000,
      paidAmount: 0,
      items: [],
      matchingStatus: VendorInvoiceMatchingStatus.Matched,
      status: VendorInvoiceStatus.Posted,
    });

    await connection.model(PaymentSchedule.name).create({
      scheduleNumber: 'PS-001',
      projectId: project._id,
      customerId,
      bookingId: new Types.ObjectId(),
      unitId: new Types.ObjectId(),
      scheduleType: PaymentScheduleType.DateBased,
      totalAmount: 25_000,
      revisionNumber: 1,
      status: PaymentScheduleStatus.Active,
      lines: [
        {
          sequence: 1,
          milestone: 'Booking',
          dueDate: new Date('2026-05-01T00:00:00.000Z'),
          percentage: 100,
          amount: 25_000,
          tax: 0,
          collectedAmount: 5_000,
          status: PaymentScheduleLineStatus.Overdue,
        },
      ],
    });
  });

  it('lists all accounting reports', () => {
    const list = service.listReports();
    expect(list.data!.length).toBe(20);
  });

  it('builds a reconciled trial balance for FY + project', async () => {
    const result = await service.getReport(AccountingReportType.TrialBalance, {
      financialYearId: fyId,
      projectId,
    }, actorId);
    const data = result.data!;
    expect(data.meta.reconciled).toBe(true);
    expect(data.totals!.periodDebit).toBe(data.totals!.periodCredit);
    expect(data.totals!.closingDebit).toBe(data.totals!.closingCredit);
    expect(
      (data.rows as Array<{ accountCode: string }>).some(
        (r) => r.accountCode === '5100',
      ),
    ).toBe(true);
  });

  it('builds journal register with drill-downs and balanced totals', async () => {
    const result = await service.getReport(
      AccountingReportType.JournalRegister,
      { financialYearId: fyId, projectId },
      actorId,
    );
    const data = result.data!;
    expect(data.meta.reconciled).toBe(true);
    expect(data.totals!.journalCount).toBeGreaterThanOrEqual(4);
    const row = (data.rows as Array<{ drillDown: unknown[]; balanced: boolean }>)[0];
    expect(row.balanced).toBe(true);
    expect(row.drillDown.length).toBeGreaterThan(0);
  });

  it('builds bank book with opening + movement reconciliation', async () => {
    const result = await service.getReport(AccountingReportType.BankBook, {
      financialYearId: fyId,
      projectId,
      from: '2026-04-01',
      to: '2027-03-31',
    }, actorId);
    const data = result.data!;
    expect(data.meta.reconciled).toBe(true);
    expect(data.totals!.openingBalance).toBe(100_000);
    // +50k receipt −15k payment
    expect(data.totals!.closingBalance).toBe(135_000);
    expect(
      (data.rows as Array<{ drillDown: unknown[] }>).every(
        (r) => r.drillDown.length > 0,
      ),
    ).toBe(true);
  });

  it('builds vendor ledger filtered by party', async () => {
    const result = await service.getReport(AccountingReportType.VendorLedger, {
      financialYearId: fyId,
      projectId,
      partyId: String(vendorId),
    }, actorId);
    const data = result.data!;
    const rows = data.rows as Array<{ partyId: string; partyName: string | null }>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.partyId === String(vendorId))).toBe(true);
    expect(rows.some((r) => r.partyName === 'Steel Suppliers')).toBe(true);
  });

  it('builds project P&L and cost sheet', async () => {
    const pnl = await service.getReport(
      AccountingReportType.ProjectProfitAndLoss,
      { financialYearId: fyId, projectId },
      actorId,
    );
    expect(pnl.data!.totals!.income).toBe(10_000);
    expect(pnl.data!.totals!.expense).toBe(20_000);
    expect(pnl.data!.totals!.netProfit).toBe(-10_000);

    const cost = await service.getReport(
      AccountingReportType.ProjectCostSheet,
      { financialYearId: fyId, projectId },
      actorId,
    );
    expect(cost.data!.totals!.cost).toBe(20_000);
  });

  it('builds company P&L for financial year', async () => {
    const pnl = await service.getReport(
      AccountingReportType.CompanyProfitAndLoss,
      { financialYearId: fyId },
      actorId,
    );
    expect(pnl.data!.meta.reportType).toBe(
      AccountingReportType.CompanyProfitAndLoss,
    );
    expect(pnl.data!.totals!.income).toBe(10_000);
    expect(pnl.data!.totals!.expense).toBe(20_000);
    expect(pnl.data!.totals!.netProfit).toBe(-10_000);
  });

  it('builds a reconciled company balance sheet with current year earnings plug', async () => {
    const result = await service.getReport(
      AccountingReportType.BalanceSheet,
      { financialYearId: fyId, projectId },
      actorId,
    );
    const data = result.data!;
    expect(data.meta.reconciled).toBe(true);
    expect(data.totals!.assets).toBe(135_000);
    expect(data.totals!.liabilities).toBe(145_000);
    expect(data.totals!.currentYearEarnings).toBe(-10_000);
    expect(data.totals!.liabilitiesAndEquity).toBe(135_000);
    expect(data.totals!.assets).toBe(data.totals!.liabilitiesAndEquity);
  });

  it('builds AP/AR ageing with reconciling bucket totals', async () => {
    const ap = await service.getReport(
      AccountingReportType.AccountsPayableAgeing,
      { projectId, to: '2026-07-20' },
      actorId,
    );
    expect(ap.data!.meta.reconciled).toBe(true);
    expect(ap.data!.totals!.total).toBe(8_000);

    const ar = await service.getReport(
      AccountingReportType.AccountsReceivableAgeing,
      { projectId, to: '2026-07-20' },
      actorId,
    );
    expect(ar.data!.meta.reconciled).toBe(true);
    expect(ar.data!.totals!.total).toBe(20_000);
  });

  it('builds project fund flow and cash flow', async () => {
    const fund = await service.getReport(
      AccountingReportType.ProjectFundFlow,
      {
        financialYearId: fyId,
        projectId,
        from: '2026-04-01',
        to: '2027-03-31',
      },
      actorId,
    );
    expect(fund.data!.meta.reconciled).toBe(true);
    expect(fund.data!.totals!.opening).toBe(100_000);
    expect(fund.data!.totals!.closing).toBe(135_000);

    const cf = await service.getReport(AccountingReportType.CashFlow, {
      financialYearId: fyId,
      projectId,
    }, actorId);
    expect(cf.data!.totals!.bookNetMovement).toBeDefined();
  });

  it('exports PDF and Excel buffers', async () => {
    const xlsx = await exportService.export(
      AccountingReportType.TrialBalance,
      { financialYearId: fyId, projectId },
      'xlsx',
    );
    expect(xlsx.contentType).toContain('spreadsheetml');
    expect(xlsx.buffer.length).toBeGreaterThan(100);

    const pdf = await exportService.export(
      AccountingReportType.JournalRegister,
      { financialYearId: fyId, projectId },
      'pdf',
    );
    expect(pdf.contentType).toBe('application/pdf');
    expect(pdf.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  // keep referenced ids for lint noise avoidance in case of unused
  it('seeds expected chart accounts', () => {
    expect(cashId).toBeTruthy();
    expect(expenseId).toBeTruthy();
    expect(incomeId).toBeTruthy();
    expect(vendorPayableId).toBeTruthy();
    expect(customerAdvanceId).toBeTruthy();
    expect(bankId).toBeTruthy();
  });
});
