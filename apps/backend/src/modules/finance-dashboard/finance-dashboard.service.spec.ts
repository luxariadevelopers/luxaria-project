import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  BankAccountStatus,
  BankAccountType,
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  CashAccount,
  CashAccountKind,
  CashAccountSchema,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  ContractorBill,
  ContractorBillSchema,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  ContractorPayment,
  ContractorPaymentMode,
  ContractorPaymentSchema,
  ContractorPaymentStatus,
} from '../contractor-payments/schemas/contractor-payment.schema';
import {
  FinancialYear,
  FinancialYearSchema,
} from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  PaymentDemand,
  PaymentDemandSchema,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleSchema,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from '../payment-schedules/schemas/payment-schedule.schema';
import {
  PettyCashExpenseCategory,
  PettyCashRequirement,
  PettyCashRequirementSchema,
  PettyCashRequirementStatus,
} from '../petty-cash-requirements/schemas/petty-cash-requirement.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import {
  CommitmentStatus,
  ContributionCommitment,
  ContributionCommitmentSchema,
  ContributionType,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  InstrumentType,
  ParticipantApprovalStatus,
  ParticipantType,
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceSchema,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  VendorPayment,
  VendorPaymentMode,
  VendorPaymentSchema,
  VendorPaymentStatus,
} from '../vendor-payments/schemas/vendor-payment.schema';
import { FinanceDashboardExportService } from './finance-dashboard-export.service';
import { FinanceDashboardService } from './finance-dashboard.service';

describe('FinanceDashboardService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: FinanceDashboardService;
  let exportService: FinanceDashboardExportService;
  let projectAccess: {
    listAccessibleProjectIds: jest.Mock;
    assertCanAccessProject: jest.Mock;
  };
  let actorId: string;
  let projectId: string;
  let projectOid: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    projectAccess = {
      listAccessibleProjectIds: jest.fn().mockResolvedValue({
        globalAccess: true,
        projectIds: [],
      }),
      assertCanAccessProject: jest.fn().mockResolvedValue({ allowed: true }),
    };

    service = new FinanceDashboardService(
      connection.model(
        CompanyBankAccount.name,
        CompanyBankAccountSchema,
      ) as Model<CompanyBankAccount>,
      connection.model(CashAccount.name, CashAccountSchema) as Model<CashAccount>,
      connection.model(
        JournalEntry.name,
        JournalEntrySchema,
      ) as Model<JournalEntry>,
      connection.model(
        VendorInvoice.name,
        VendorInvoiceSchema,
      ) as Model<VendorInvoice>,
      connection.model(
        ContractorBill.name,
        ContractorBillSchema,
      ) as Model<ContractorBill>,
      connection.model(
        PaymentSchedule.name,
        PaymentScheduleSchema,
      ) as Model<PaymentSchedule>,
      connection.model(
        PaymentDemand.name,
        PaymentDemandSchema,
      ) as Model<PaymentDemand>,
      connection.model(
        ContributionCommitment.name,
        ContributionCommitmentSchema,
      ) as Model<ContributionCommitment>,
      connection.model(
        ProjectParticipant.name,
        ProjectParticipantSchema,
      ) as Model<ProjectParticipant>,
      connection.model(
        VendorPayment.name,
        VendorPaymentSchema,
      ) as Model<VendorPayment>,
      connection.model(
        ContractorPayment.name,
        ContractorPaymentSchema,
      ) as Model<ContractorPayment>,
      connection.model(
        PettyCashRequirement.name,
        PettyCashRequirementSchema,
      ) as Model<PettyCashRequirement>,
      connection.model(Project.name, ProjectSchema) as Model<Project>,
      connection.model(
        FinancialYear.name,
        FinancialYearSchema,
      ) as Model<FinancialYear>,
      projectAccess as unknown as ProjectAccessService,
    );

    exportService = new FinanceDashboardExportService(service);
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-FD-001',
        projectName: 'Finance Tower',
        projectType: ProjectType.Commercial,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        companyId: new Types.ObjectId(),
      },
    ]);
    projectOid = project._id as Types.ObjectId;
    projectId = String(projectOid);

    await connection.model(CompanyBankAccount.name).create({
      accountCode: 'BANK-FD-001',
      bankName: 'SBI',
      branch: 'Main',
      accountHolderName: 'Luxaria',
      maskedAccountNumber: 'XXXXXX1111',
      encryptedAccountNumber: 'enc',
      ifsc: 'SBIN0000001',
      accountType: BankAccountType.Current,
      projectId: projectOid,
      ledgerAccountId: new Types.ObjectId(),
      openingBalance: 5_000_000,
      status: BankAccountStatus.Active,
      isDefault: true,
    });

    await connection.model(CashAccount.name).create({
      accountCode: 'CASH-FD-001',
      accountName: 'Petty',
      kind: CashAccountKind.PettyCash,
      projectId: projectOid,
      custodianUserId: new Types.ObjectId(),
      ledgerAccountId: new Types.ObjectId(),
      maximumHoldingLimit: 50_000,
      replenishmentLevel: 10_000,
      openingBalance: 15_000,
      status: CashAccountStatus.Active,
    });

    await connection.model(VendorInvoice.name).create({
      documentNumber: 'VI-2026-900001',
      invoiceNumber: 'V-900',
      vendorId: new Types.ObjectId(),
      projectId: projectOid,
      purchaseOrderId: new Types.ObjectId(),
      invoiceDate: new Date('2026-05-01'),
      dueDate: new Date('2026-06-01'),
      taxableValue: 100_000,
      gst: 18_000,
      tds: 0,
      retention: 0,
      freight: 0,
      discount: 0,
      totalAmount: 118_000,
      paidAmount: 0,
      items: [],
      matchingStatus: VendorInvoiceMatchingStatus.Matched,
      status: VendorInvoiceStatus.Posted,
    });

    await connection.model(ContractorBill.name).create({
      billNumber: 'CB-FD-001',
      raNumber: 1,
      contractorId: new Types.ObjectId(),
      projectId: projectOid,
      agreementId: new Types.ObjectId(),
      billingPeriod: {
        from: new Date('2026-05-01'),
        to: new Date('2026-05-31'),
      },
      measurements: [],
      previousCertifiedValue: 0,
      currentCertifiedValue: 250_000,
      cumulativeValue: 250_000,
      advanceRecovery: 0,
      materialRecovery: 0,
      retention: 0,
      tds: 0,
      penalty: 0,
      otherDeductions: 0,
      netPayable: 250_000,
      paidAmount: 50_000,
      status: ContractorBillStatus.Posted,
      postedAt: new Date('2026-06-05'),
    });

    await connection.model(PaymentSchedule.name).create({
      scheduleNumber: 'PS-FD-001',
      bookingId: new Types.ObjectId(),
      projectId: projectOid,
      customerId: new Types.ObjectId(),
      unitId: new Types.ObjectId(),
      scheduleType: PaymentScheduleType.DateBased,
      totalAmount: 2_000_000,
      status: PaymentScheduleStatus.Active,
      revisionNumber: 1,
      lines: [
        {
          sequence: 1,
          milestone: 'Agreement',
          dueDate: new Date('2026-07-25'),
          percentage: 10,
          amount: 200_000,
          tax: 0,
          collectedAmount: 0,
          status: PaymentScheduleLineStatus.Due,
        },
        {
          sequence: 2,
          milestone: 'Booking',
          dueDate: new Date('2026-06-01'),
          percentage: 5,
          amount: 100_000,
          tax: 0,
          collectedAmount: 0,
          status: PaymentScheduleLineStatus.Overdue,
        },
      ],
    });

    const directorId = new Types.ObjectId();
    const [participant] = await connection
      .model(ProjectParticipant.name)
      .create([
        {
          projectId: projectOid,
          participantType: ParticipantType.Director,
          participantId: directorId,
          participantKey: `director:${String(directorId)}`,
          participantLabel: 'Dir',
          commitmentAmount: 1_000_000,
          expectedContributionDate: new Date('2026-06-01'),
          actualContributionAmount: 200_000,
          approvedProfitSharePercentage: 50,
          lossSharePercentage: 50,
          interestRate: null,
          instrumentType: InstrumentType.DirectorLoan,
          effectiveFrom: new Date('2026-04-01'),
          effectiveTo: null,
          status: ParticipantApprovalStatus.Approved,
          version: 1,
        },
      ]);

    await connection.model(ContributionCommitment.name).create({
      projectId: projectOid,
      participantId: participant._id,
      commitmentNumber: 'COM-FD-000001',
      commitmentAmount: 1_000_000,
      commitmentDate: new Date('2026-05-01'),
      dueDate: new Date('2026-07-28'),
      contributionType: ContributionType.Loan,
      receivedAmount: 200_000,
      status: CommitmentStatus.Approved,
      version: 1,
    });

    await connection.model(VendorPayment.name).create({
      paymentNumber: 'VP-FD-001',
      vendorId: new Types.ObjectId(),
      projectId: projectOid,
      invoiceIds: [],
      allocations: [],
      paymentDate: new Date('2026-07-20'),
      amount: 50_000,
      paymentMode: VendorPaymentMode.Neft,
      bankAccountId: new Types.ObjectId(),
      transactionReference: 'UTR-FD-1',
      tds: 0,
      retention: 0,
      deductions: 0,
      bankAmount: 50_000,
      status: VendorPaymentStatus.Approval,
    });

    await connection.model(ContractorPayment.name).create({
      paymentNumber: 'CP-FD-001',
      contractorId: new Types.ObjectId(),
      projectId: projectOid,
      billIds: [],
      allocations: [],
      paymentDate: new Date('2026-07-20'),
      amount: 75_000,
      paymentMode: ContractorPaymentMode.Neft,
      bankAccountId: new Types.ObjectId(),
      transactionReference: 'UTR-FD-2',
      tds: 0,
      retention: 0,
      advanceRecovery: 0,
      penalty: 0,
      bankAmount: 75_000,
      status: ContractorPaymentStatus.Approval,
    });

    await connection.model(PettyCashRequirement.name).create({
      requestNumber: 'PCR-FD-001',
      projectId: projectOid,
      pettyCashAccountId: new Types.ObjectId(),
      requestedBy: new Types.ObjectId(),
      weekStartDate: new Date('2026-07-14'),
      weekEndDate: new Date('2026-07-20'),
      currentCashBalance: 5_000,
      previousUnsettledAmount: 0,
      requestedAmount: 20_000,
      approvedAmount: 20_000,
      fundedAmount: 20_000,
      requirementItems: [
        {
          expenseCategory: PettyCashExpenseCategory.SiteMisc,
          description: 'Misc',
          estimatedAmount: 20_000,
        },
      ],
      justification: 'Site float',
      status: PettyCashRequirementStatus.Funded,
    });

    await connection.model(JournalEntry.name).create({
      journalNumber: 'JV-FD-001',
      journalDate: new Date('2026-07-18'),
      financialYearId: new Types.ObjectId(),
      projectId: projectOid,
      narration: 'Pending',
      status: JournalStatus.PendingApproval,
      lines: [
        {
          accountId: new Types.ObjectId(),
          debit: 1000,
          credit: 0,
        },
        {
          accountId: new Types.ObjectId(),
          debit: 0,
          credit: 1000,
        },
      ],
    });
  });

  it('returns finance dashboard with ageing, approvals, forecast and stubs', async () => {
    const res = await service.getSummary(
      { date: '2026-07-20', horizonDays: 30, projectId },
      actorId,
    );

    expect(res.success).toBe(true);
    const data = res.data!;

    expect(data.companyBankBalances.amount).toBe(5_000_000);
    expect(data.cashBalances.amount).toBe(15_000);
    expect(data.projectFundPosition[0].bankBalance).toBe(5_000_000);
    expect(data.projectFundPosition[0].vendorPayable).toBe(118_000);
    expect(data.projectFundPosition[0].contractorPayable).toBe(200_000);

    expect(data.vendorAgeing.total).toBe(118_000);
    expect(data.vendorAgeing.d31_60 + data.vendorAgeing.d0_30 + data.vendorAgeing.d61_90 + data.vendorAgeing.d90Plus + data.vendorAgeing.current).toBe(
      118_000,
    );
    expect(data.contractorAgeing.total).toBe(200_000);

    expect(data.customerReceivables.amount).toBe(300_000);
    expect(data.directorContributionPending.pendingAmount).toBe(800_000);

    expect(data.paymentApprovals.amount).toBe(125_000);
    expect(data.overduePayments.amount).toBeGreaterThanOrEqual(218_000);
    expect(data.unsettledPettyCash.amount).toBe(20_000);
    expect(data.journalErrors.count).toBe(1);

    expect(data.bankReconciliationPending.available).toBe(false);
    expect(data.cashFlowForecast.totalInflows).toBeGreaterThan(0);
    expect(data.cashFlowForecast.series.length).toBeGreaterThan(0);
    expect(data.companyBankBalances.drillDown[0].href).toMatch(/^\/api\/v1\//);
  });

  it('exports csv and xlsx', async () => {
    const csv = await exportService.export(
      { date: '2026-07-20', projectId },
      actorId,
      'csv',
    );
    expect(csv.filename).toContain('.csv');
    expect(csv.buffer.toString('utf8')).toContain('companyBankBalances');

    const xlsx = await exportService.export(
      { date: '2026-07-20', projectId },
      actorId,
      'xlsx',
    );
    expect(xlsx.filename).toContain('.xlsx');
    expect(xlsx.buffer.length).toBeGreaterThan(100);
  });
});
