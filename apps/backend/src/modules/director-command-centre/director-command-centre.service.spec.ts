import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  BoqVersion,
  BoqVersionSchema,
  BoqVersionStatus,
  BoqVersionType,
} from '../boq/schemas/boq.schema';
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
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import {
  CustomerReceipt,
  CustomerReceiptPaymentMode,
  CustomerReceiptSchema,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  DprMissingAlert,
  DprMissingAlertSchema,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  FinancialYear,
  FinancialYearSchema,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  ManpowerEscalation,
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
  ManpowerShortfallAlertType,
} from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleSchema,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from '../payment-schedules/schemas/payment-schedule.schema';
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
  PurchaseRequest,
  PurchaseRequestPriority,
  PurchaseRequestSchema,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  StockReorderAlert,
  StockReorderAlertSchema,
  StockReorderAlertStatus,
  StockReorderAlertType,
} from '../stock-reorder/schemas/stock-reorder-alert.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceSchema,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { BoqUnit } from '../boq/schemas/boq.schema';
import { MaterialUnit } from '../material-master/schemas/material.schema';
import { DirectorCommandCentreService } from './director-command-centre.service';

describe('DirectorCommandCentreService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: DirectorCommandCentreService;
  let projectAccess: { listAccessibleProjectIds: jest.Mock };

  let actorId: string;
  let projectId: Types.ObjectId;
  let directorId: Types.ObjectId;
  let fyId: string;
  let asOf: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    const bankModel = connection.model(
      CompanyBankAccount.name,
      CompanyBankAccountSchema,
    ) as Model<CompanyBankAccount>;
    const cashModel = connection.model(
      CashAccount.name,
      CashAccountSchema,
    ) as Model<CashAccount>;
    const journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    const commitmentModel = connection.model(
      ContributionCommitment.name,
      ContributionCommitmentSchema,
    ) as Model<ContributionCommitment>;
    const participantModel = connection.model(
      ProjectParticipant.name,
      ProjectParticipantSchema,
    ) as Model<ProjectParticipant>;
    const customerReceiptModel = connection.model(
      CustomerReceipt.name,
      CustomerReceiptSchema,
    ) as Model<CustomerReceipt>;
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
    const purchaseRequestModel = connection.model(
      PurchaseRequest.name,
      PurchaseRequestSchema,
    ) as Model<PurchaseRequest>;
    const boqVersionModel = connection.model(
      BoqVersion.name,
      BoqVersionSchema,
    ) as Model<BoqVersion>;
    const workMeasurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    const stockAlertModel = connection.model(
      StockReorderAlert.name,
      StockReorderAlertSchema,
    ) as Model<StockReorderAlert>;
    const manpowerAlertModel = connection.model(
      ManpowerShortfallAlert.name,
      ManpowerShortfallAlertSchema,
    ) as Model<ManpowerShortfallAlert>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    const dprMissingModel = connection.model(
      DprMissingAlert.name,
      DprMissingAlertSchema,
    ) as Model<DprMissingAlert>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const financialYearModel = connection.model(
      FinancialYear.name,
      FinancialYearSchema,
    ) as Model<FinancialYear>;

    projectAccess = {
      listAccessibleProjectIds: jest.fn().mockResolvedValue({
        globalAccess: true,
        projectIds: [],
      }),
    };

    service = new DirectorCommandCentreService(
      bankModel,
      cashModel,
      journalModel,
      commitmentModel,
      participantModel,
      customerReceiptModel,
      vendorInvoiceModel,
      contractorBillModel,
      paymentScheduleModel,
      purchaseRequestModel,
      boqVersionModel,
      workMeasurementModel,
      stockAlertModel,
      manpowerAlertModel,
      contractorModel,
      dprMissingModel,
      projectModel,
      financialYearModel,
      projectAccess as unknown as ProjectAccessService,
    );
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    directorId = new Types.ObjectId();
    asOf = '2026-07-20';

    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-DCC-001',
        projectName: 'Harbour Towers',
        projectType: ProjectType.Residential,
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
    projectId = project._id as Types.ObjectId;

    const [fy] = await connection.model(FinancialYear.name).create([
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

    const ledgerBank = new Types.ObjectId();
    const ledgerCash = new Types.ObjectId();

    await connection.model(CompanyBankAccount.name).create({
      accountCode: 'BANK-DCC-001',
      bankName: 'HDFC',
      branch: 'T Nagar',
      accountHolderName: 'Luxaria',
      maskedAccountNumber: 'XXXXXX1234',
      encryptedAccountNumber: 'enc',
      ifsc: 'HDFC0000001',
      accountType: BankAccountType.Current,
      projectId,
      ledgerAccountId: ledgerBank,
      openingBalance: 1_000_000,
      status: BankAccountStatus.Active,
      isDefault: true,
    });

    await connection.model(CashAccount.name).create({
      accountCode: 'CASH-DCC-001',
      accountName: 'Site petty cash',
      kind: CashAccountKind.PettyCash,
      projectId,
      custodianUserId: new Types.ObjectId(),
      ledgerAccountId: ledgerCash,
      maximumHoldingLimit: 50_000,
      replenishmentLevel: 10_000,
      openingBalance: 25_000,
      status: CashAccountStatus.Active,
    });

    const [participant] = await connection
      .model(ProjectParticipant.name)
      .create([
        {
          projectId,
          participantType: ParticipantType.Director,
          participantId: directorId,
          participantKey: `director:${String(directorId)}`,
          participantLabel: 'Director A',
          commitmentAmount: 5_000_000,
          expectedContributionDate: new Date('2026-06-01'),
          actualContributionAmount: 2_000_000,
          approvedProfitSharePercentage: 40,
          lossSharePercentage: 40,
          interestRate: null,
          instrumentType: InstrumentType.DirectorLoan,
          effectiveFrom: new Date('2026-04-01'),
          effectiveTo: null,
          status: ParticipantApprovalStatus.Approved,
          version: 1,
        },
      ]);

    await connection.model(ContributionCommitment.name).create({
      projectId,
      participantId: participant._id,
      commitmentNumber: 'COM-2026-000001',
      commitmentAmount: 5_000_000,
      commitmentDate: new Date('2026-05-01'),
      dueDate: new Date('2026-08-01'),
      contributionType: ContributionType.Loan,
      receivedAmount: 2_000_000,
      status: CommitmentStatus.Approved,
      version: 1,
    });

    await connection.model(CustomerReceipt.name).create({
      receiptNumber: 'CR-2026-000001',
      customerId: new Types.ObjectId(),
      bookingId: new Types.ObjectId(),
      unitId: new Types.ObjectId(),
      projectId,
      receiptDate: new Date('2026-07-15'),
      amount: 500_000,
      paymentMode: CustomerReceiptPaymentMode.Neft,
      companyBankAccountId: new Types.ObjectId(),
      transactionReference: 'TXN-DCC-1',
      sourceType: CustomerReceiptSourceType.OwnFund,
      status: CustomerReceiptStatus.Posted,
      scheduleAllocation: [],
      allocatedAmount: 500_000,
      unallocatedAmount: 0,
    });

    await connection.model(VendorInvoice.name).create([
      {
        documentNumber: 'VI-2026-000001',
        invoiceNumber: 'VEN-INV-001',
        vendorId: new Types.ObjectId(),
        projectId,
        purchaseOrderId: new Types.ObjectId(),
        invoiceDate: new Date('2026-07-01'),
        dueDate: new Date('2026-07-20T12:00:00.000Z'),
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
      },
      {
        documentNumber: 'VI-2026-000002',
        invoiceNumber: 'VEN-INV-002',
        vendorId: new Types.ObjectId(),
        projectId,
        purchaseOrderId: new Types.ObjectId(),
        invoiceDate: new Date('2026-06-01'),
        dueDate: new Date('2026-06-15T12:00:00.000Z'),
        taxableValue: 50_000,
        gst: 9_000,
        tds: 0,
        retention: 0,
        freight: 0,
        discount: 0,
        totalAmount: 59_000,
        paidAmount: 0,
        items: [],
        matchingStatus: VendorInvoiceMatchingStatus.Exception,
        status: VendorInvoiceStatus.Posted,
      },
    ]);

    await connection.model(ContractorBill.name).create({
      billNumber: 'CB-DCC-001',
      raNumber: 1,
      contractorId: new Types.ObjectId(),
      projectId,
      agreementId: new Types.ObjectId(),
      billingPeriod: {
        from: new Date('2026-06-01'),
        to: new Date('2026-06-30'),
      },
      measurements: [],
      previousCertifiedValue: 0,
      currentCertifiedValue: 200_000,
      cumulativeValue: 200_000,
      advanceRecovery: 0,
      materialRecovery: 0,
      retention: 10_000,
      tds: 2_000,
      penalty: 0,
      otherDeductions: 0,
      netPayable: 188_000,
      paidAmount: 50_000,
      status: ContractorBillStatus.Posted,
      postedAt: new Date('2026-07-05'),
    });

    await connection.model(PaymentSchedule.name).create({
      scheduleNumber: 'PS-DCC-001',
      bookingId: new Types.ObjectId(),
      projectId,
      customerId: new Types.ObjectId(),
      unitId: new Types.ObjectId(),
      scheduleType: PaymentScheduleType.DateBased,
      totalAmount: 1_000_000,
      status: PaymentScheduleStatus.Active,
      revisionNumber: 1,
      lines: [
        {
          sequence: 1,
          milestone: 'Booking',
          dueDate: new Date('2026-07-10'),
          percentage: 10,
          amount: 100_000,
          tax: 0,
          collectedAmount: 20_000,
          status: PaymentScheduleLineStatus.Overdue,
        },
      ],
    });

    await connection.model(PurchaseRequest.name).create({
      requestNumber: 'PR-DCC-001',
      projectId,
      requestedBy: new Types.ObjectId(),
      priority: PurchaseRequestPriority.Normal,
      requiredByDate: new Date('2026-07-25'),
      justification: 'Site requirement',
      status: PurchaseRequestStatus.Submitted,
      items: [
        {
          materialId: new Types.ObjectId(),
          requestedQuantity: 10,
          unit: MaterialUnit.Bag,
        },
      ],
    });

    await connection.model(BoqVersion.name).create({
      projectId,
      versionNumber: 1,
      versionType: BoqVersionType.Original,
      effectiveDate: new Date('2026-04-01'),
      reason: 'Baseline',
      costImpact: 0,
      timeImpact: 0,
      status: BoqVersionStatus.Active,
      totalPlannedValue: 10_000_000,
    });

    await connection.model(WorkMeasurement.name).create({
      measurementNumber: 'WM-DCC-001',
      projectId,
      contractorId: new Types.ObjectId(),
      boqItemId: new Types.ObjectId(),
      location: 'Block A',
      measurementDate: new Date('2026-07-10'),
      previousQuantity: 0,
      currentQuantity: 40,
      cumulativeQuantity: 40,
      unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(),
      status: WorkMeasurementStatus.Verified,
      boqPlannedQuantity: 100,
    });

    await connection.model(StockReorderAlert.name).create({
      projectId,
      materialId: new Types.ObjectId(),
      materialCode: 'MAT-001',
      materialName: 'Cement',
      alertType: StockReorderAlertType.BelowReorderLevel,
      status: StockReorderAlertStatus.Open,
      message: 'Cement below reorder level',
      availableStock: 5,
      pendingPoQuantity: 0,
      averageDailyConsumption: 2,
      reorderLevel: 20,
      recommendedPurchaseQuantity: 40,
      baseUnit: MaterialUnit.Bag,
      evaluatedAt: new Date('2026-07-20'),
    });

    await connection.model(ManpowerShortfallAlert.name).create({
      projectId,
      contractorId: new Types.ObjectId(),
      asOfDate: new Date('2026-07-19'),
      alertType: ManpowerShortfallAlertType.Below60ThreeDays,
      message: 'Labour below 60% for 3 days',
      shortfallPercent: 45,
      consecutiveDays: 3,
      agreementHeadcount: 20,
      plannedHeadcount: 20,
      actualHeadcount: 8,
      expectedScheduleImpactDays: 5,
      recommendedEscalation: ManpowerEscalation.Director,
      acknowledged: false,
    });

    await connection.model(Contractor.name).create({
      contractorCode: 'CTR-DCC-001',
      legalName: 'Alpha Labour',
      tradeName: 'Alpha Labour',
      contractorType: ContractorType.General,
      status: ContractorStatus.Active,
      verificationStatus: ContractorVerificationStatus.Verified,
      rating: 3.5,
    });

    await connection.model(DprMissingAlert.name).create({
      projectId,
      reportDate: new Date('2026-07-19'),
      message: 'Missing DPR',
      acknowledged: false,
    });
  });

  it('returns full command centre summary with drill-down links', async () => {
    const res = await service.getSummary(
      { date: asOf, financialYearId: fyId },
      actorId,
    );

    expect(res.success).toBe(true);
    const data = res.data!;

    expect(data.filters.financialYearName).toBe('FY 2026-27');
    expect(data.filters.accessibleProjectCount).toBe(1);

    expect(data.totalCompanyBankBalance.amount).toBe(1_000_000);
    expect(data.totalCompanyBankBalance.drillDown[0].href).toContain(
      '/api/v1/company-bank-accounts',
    );

    expect(data.totalCashBalance.amount).toBe(25_000);
    expect(data.projectWisePettyCash[0].amount).toBe(25_000);
    expect(data.projectWiseBankBalance[0].projectCode).toBe('PRJ-DCC-001');

    expect(data.directorContributionSummary.committedAmount).toBe(5_000_000);
    expect(data.directorContributionSummary.receivedAmount).toBe(2_000_000);
    expect(data.directorContributionSummary.pendingAmount).toBe(3_000_000);
    expect(data.directorContributionSummary.drillDown.length).toBeGreaterThan(
      0,
    );

    expect(data.customerCollections.amount).toBe(500_000);
    expect(data.customerCollections.drillDown[0].href).toContain(
      '/api/v1/customer-receipts',
    );

    expect(data.vendorPayable.amount).toBe(177_000);
    expect(data.contractorPayable.amount).toBe(138_000);

    expect(data.paymentsDueToday.amount).toBe(118_000);
    expect(data.overduePayments.amount).toBeGreaterThanOrEqual(139_000);

    expect(data.purchaseRequestsPending.count).toBe(1);
    expect(data.costVersusBudget[0].budgetAmount).toBe(10_000_000);
    expect(data.physicalProgress[0].progressPercent).toBe(40);
    expect(data.boqUtilisation[0].utilisedQuantityPercent).toBe(40);

    expect(data.materialStockAlerts.count).toBe(1);
    expect(data.labourShortfall.count).toBe(1);
    expect(data.contractorPerformance.length).toBeGreaterThanOrEqual(1);

    const codes = data.criticalExceptions.map((e) => e.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'OVERDUE_PAYMENTS',
        'VENDOR_MATCH_EXCEPTION',
        'LABOUR_SHORTFALL',
        'MATERIAL_STOCK',
        'MISSING_DPR',
        'PR_PENDING',
      ]),
    );

    for (const ex of data.criticalExceptions) {
      expect(ex.drillDown.length).toBeGreaterThan(0);
      expect(ex.drillDown[0].href).toMatch(/^\/api\/v1\//);
    }
  });

  it('filters by project and director', async () => {
    const res = await service.getSummary(
      {
        date: asOf,
        projectId: String(projectId),
        directorId: String(directorId),
      },
      actorId,
    );

    expect(res.data?.filters.projectId).toBe(String(projectId));
    expect(res.data?.filters.directorId).toBe(String(directorId));
    expect(res.data?.filters.accessibleProjectCount).toBe(1);
    expect(res.data?.directorContributionSummary.commitmentCount).toBe(1);
  });

  it('returns empty project scope when director has no participation', async () => {
    const res = await service.getSummary(
      {
        date: asOf,
        directorId: new Types.ObjectId().toHexString(),
      },
      actorId,
    );

    expect(res.data?.filters.accessibleProjectCount).toBe(0);
    expect(res.data?.totalCompanyBankBalance.amount).toBe(0);
    expect(res.data?.customerCollections.amount).toBe(0);
  });

  it('respects project access restrictions', async () => {
    projectAccess.listAccessibleProjectIds.mockResolvedValueOnce({
      globalAccess: false,
      projectIds: [],
    });

    await expect(
      service.getSummary(
        { date: asOf, projectId: String(projectId) },
        actorId,
      ),
    ).rejects.toThrow('Project is not accessible');
  });
});
