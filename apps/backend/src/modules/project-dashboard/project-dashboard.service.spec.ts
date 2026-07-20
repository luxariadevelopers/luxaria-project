import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  BoqUnit,
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
  CustomerReceipt,
  CustomerReceiptPaymentMode,
  CustomerReceiptSchema,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import {
  DailyProgressReport,
  DailyProgressReportSchema,
  DprMissingAlert,
  DprMissingAlertSchema,
  DprStatus,
  DprWeather,
} from '../daily-progress-reports/schemas/daily-progress-report.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../journal/schemas/journal-entry.schema';
import {
  LabourAttendance,
  LabourAttendanceEntryMode,
  LabourAttendanceSchema,
  LabourAttendanceStatus,
} from '../labour-attendance/schemas/labour-attendance.schema';
import {
  ManpowerEscalation,
  ManpowerShortfallAlert,
  ManpowerShortfallAlertSchema,
  ManpowerShortfallAlertType,
} from '../manpower-planning/schemas/manpower-shortfall-alert.schema';
import { MaterialUnit } from '../material-master/schemas/material.schema';
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
  ProjectDocumentCategory,
  ProjectFile,
  ProjectFileSchema,
} from '../projects/schemas/project-document.schema';
import {
  Project,
  ProjectSchema,
  ProjectStage,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  PurchaseOrder,
  PurchaseOrderSchema,
  PurchaseOrderStatus,
} from '../purchase-orders/schemas/purchase-order.schema';
import {
  PurchaseRequest,
  PurchaseRequestPriority,
  PurchaseRequestSchema,
  PurchaseRequestStatus,
} from '../purchase-requests/schemas/purchase-request.schema';
import {
  MaterialStockBalance,
  MaterialStockBalanceSchema,
} from '../stock-ledger/schemas/material-stock-balance.schema';
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
import { ProjectDashboardService } from './project-dashboard.service';

describe('ProjectDashboardService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ProjectDashboardService;
  let projectId: string;
  let projectOid: Types.ObjectId;
  let contractorId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    service = new ProjectDashboardService(
      connection.model(Project.name, ProjectSchema) as Model<Project>,
      connection.model(BoqVersion.name, BoqVersionSchema) as Model<BoqVersion>,
      connection.model(
        WorkMeasurement.name,
        WorkMeasurementSchema,
      ) as Model<WorkMeasurement>,
      connection.model(
        VendorInvoice.name,
        VendorInvoiceSchema,
      ) as Model<VendorInvoice>,
      connection.model(
        ContractorBill.name,
        ContractorBillSchema,
      ) as Model<ContractorBill>,
      connection.model(
        PurchaseOrder.name,
        PurchaseOrderSchema,
      ) as Model<PurchaseOrder>,
      connection.model(
        CustomerReceipt.name,
        CustomerReceiptSchema,
      ) as Model<CustomerReceipt>,
      connection.model(
        ContributionCommitment.name,
        ContributionCommitmentSchema,
      ) as Model<ContributionCommitment>,
      connection.model(
        ProjectParticipant.name,
        ProjectParticipantSchema,
      ) as Model<ProjectParticipant>,
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
        MaterialStockBalance.name,
        MaterialStockBalanceSchema,
      ) as Model<MaterialStockBalance>,
      connection.model(
        LabourAttendance.name,
        LabourAttendanceSchema,
      ) as Model<LabourAttendance>,
      connection.model(ProjectFile.name, ProjectFileSchema) as Model<ProjectFile>,
      connection.model(
        DailyProgressReport.name,
        DailyProgressReportSchema,
      ) as Model<DailyProgressReport>,
      connection.model(
        StockReorderAlert.name,
        StockReorderAlertSchema,
      ) as Model<StockReorderAlert>,
      connection.model(
        ManpowerShortfallAlert.name,
        ManpowerShortfallAlertSchema,
      ) as Model<ManpowerShortfallAlert>,
      connection.model(
        DprMissingAlert.name,
        DprMissingAlertSchema,
      ) as Model<DprMissingAlert>,
      connection.model(
        PurchaseRequest.name,
        PurchaseRequestSchema,
      ) as Model<PurchaseRequest>,
    );
  });

  afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = await connection.db!.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }

    contractorId = new Types.ObjectId();
    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-PD-001',
        projectName: 'Skyline Residences',
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
        projectStage: ProjectStage.Structure,
        approvedBudget: 12_000_000,
        companyId: new Types.ObjectId(),
      },
    ]);
    projectOid = project._id as Types.ObjectId;
    projectId = String(projectOid);

    await connection.model(BoqVersion.name).create({
      projectId: projectOid,
      versionNumber: 2,
      versionType: BoqVersionType.Revision,
      effectiveDate: new Date('2026-05-01'),
      reason: 'Revision',
      costImpact: 500_000,
      timeImpact: 10,
      status: BoqVersionStatus.Active,
      totalPlannedValue: 11_500_000,
    });

    await connection.model(WorkMeasurement.name).create({
      measurementNumber: 'WM-PD-001',
      projectId: projectOid,
      contractorId,
      boqItemId: new Types.ObjectId(),
      location: 'Block A',
      measurementDate: new Date('2026-07-10'),
      previousQuantity: 0,
      currentQuantity: 50,
      cumulativeQuantity: 50,
      unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(),
      status: WorkMeasurementStatus.Verified,
      boqPlannedQuantity: 100,
    });

    await connection.model(VendorInvoice.name).create({
      documentNumber: 'VI-2026-100001',
      invoiceNumber: 'VEN-100',
      vendorId: new Types.ObjectId(),
      projectId: projectOid,
      purchaseOrderId: new Types.ObjectId(),
      invoiceDate: new Date('2026-07-05'),
      dueDate: new Date('2026-07-25'),
      taxableValue: 200_000,
      gst: 36_000,
      tds: 0,
      retention: 0,
      freight: 0,
      discount: 0,
      totalAmount: 236_000,
      paidAmount: 36_000,
      items: [],
      matchingStatus: VendorInvoiceMatchingStatus.Matched,
      status: VendorInvoiceStatus.Posted,
    });

    await connection.model(ContractorBill.name).create({
      billNumber: 'CB-PD-001',
      raNumber: 1,
      contractorId,
      projectId: projectOid,
      agreementId: new Types.ObjectId(),
      billingPeriod: {
        from: new Date('2026-06-01'),
        to: new Date('2026-06-30'),
      },
      measurements: [],
      previousCertifiedValue: 0,
      currentCertifiedValue: 400_000,
      cumulativeValue: 400_000,
      advanceRecovery: 0,
      materialRecovery: 0,
      retention: 0,
      tds: 0,
      penalty: 0,
      otherDeductions: 0,
      netPayable: 400_000,
      paidAmount: 100_000,
      status: ContractorBillStatus.Posted,
      postedAt: new Date('2026-07-08'),
    });

    await connection.model(PurchaseOrder.name).create({
      purchaseOrderNumber: 'PO-PD-001',
      projectId: projectOid,
      purchaseRequestId: new Types.ObjectId(),
      selectedQuotationId: new Types.ObjectId(),
      vendorId: new Types.ObjectId(),
      orderDate: new Date('2026-07-01'),
      expectedDeliveryDate: new Date('2026-07-30'),
      billingAddress: {
        line1: 'HQ',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      deliveryAddress: {
        line1: 'Site',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      items: [],
      subtotal: 150_000,
      taxes: 27_000,
      freight: 0,
      discount: 0,
      total: 177_000,
      status: PurchaseOrderStatus.Issued,
      revisionNumber: 1,
      balanceQuantity: 10,
      balanceAmount: 80_000,
    });

    await connection.model(CustomerReceipt.name).create({
      receiptNumber: 'CR-PD-001',
      customerId: new Types.ObjectId(),
      bookingId: new Types.ObjectId(),
      unitId: new Types.ObjectId(),
      projectId: projectOid,
      receiptDate: new Date('2026-07-12'),
      amount: 750_000,
      paymentMode: CustomerReceiptPaymentMode.Neft,
      sourceType: CustomerReceiptSourceType.OwnFund,
      status: CustomerReceiptStatus.Posted,
      allocatedAmount: 750_000,
      unallocatedAmount: 0,
    });

    const investorId = new Types.ObjectId();
    const [participant] = await connection
      .model(ProjectParticipant.name)
      .create([
        {
          projectId: projectOid,
          participantType: ParticipantType.OutsideInvestor,
          participantId: investorId,
          participantKey: `outside_investor:${String(investorId)}`,
          participantLabel: 'Investor A',
          commitmentAmount: 3_000_000,
          expectedContributionDate: new Date('2026-06-01'),
          actualContributionAmount: 1_500_000,
          approvedProfitSharePercentage: 20,
          lossSharePercentage: 20,
          interestRate: null,
          instrumentType: InstrumentType.ProjectInvestment,
          effectiveFrom: new Date('2026-04-01'),
          effectiveTo: null,
          status: ParticipantApprovalStatus.Approved,
          version: 1,
        },
      ]);

    await connection.model(ContributionCommitment.name).create({
      projectId: projectOid,
      participantId: participant._id,
      commitmentNumber: 'COM-PD-000001',
      commitmentAmount: 3_000_000,
      commitmentDate: new Date('2026-05-01'),
      contributionType: ContributionType.Capital,
      receivedAmount: 1_500_000,
      status: CommitmentStatus.Approved,
      version: 1,
    });

    await connection.model(CompanyBankAccount.name).create({
      accountCode: 'BANK-PD-001',
      bankName: 'ICICI',
      branch: 'Anna Nagar',
      accountHolderName: 'Luxaria',
      maskedAccountNumber: 'XXXXXX4321',
      encryptedAccountNumber: 'enc',
      ifsc: 'ICIC0000001',
      accountType: BankAccountType.Current,
      projectId: projectOid,
      ledgerAccountId: new Types.ObjectId(),
      openingBalance: 2_500_000,
      status: BankAccountStatus.Active,
      isDefault: true,
    });

    await connection.model(CashAccount.name).create({
      accountCode: 'CASH-PD-001',
      accountName: 'Site cash',
      kind: CashAccountKind.SiteCash,
      projectId: projectOid,
      custodianUserId: new Types.ObjectId(),
      ledgerAccountId: new Types.ObjectId(),
      maximumHoldingLimit: 100_000,
      replenishmentLevel: 20_000,
      openingBalance: 45_000,
      status: CashAccountStatus.Active,
    });

    await connection.model(MaterialStockBalance.name).create({
      materialId: new Types.ObjectId(),
      projectId: projectOid,
      location: 'Yard',
      quantityInBaseUnit: 120,
      baseUnit: MaterialUnit.Bag,
      version: 1,
    });

    await connection.model(LabourAttendance.name).create({
      attendanceNumber: 'LA-PD-001',
      projectId: projectOid,
      contractorId,
      attendanceDate: new Date('2026-07-20T00:00:00.000Z'),
      lines: [
        {
          labourCategoryId: new Types.ObjectId(),
          entryMode: LabourAttendanceEntryMode.Group,
          workerCount: 18,
          overtimeHours: 2,
          workers: [],
        },
      ],
      status: LabourAttendanceStatus.Confirmed,
    });

    await connection.model(ProjectFile.name).create({
      projectId: projectOid,
      fileName: 'site-east.jpg',
      filePath: 'uploads/projects/x/site-east.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      category: ProjectDocumentCategory.Photo,
    });

    await connection.model(DailyProgressReport.name).create({
      dprNumber: 'DPR-PD-001',
      projectId: projectOid,
      reportDate: new Date('2026-07-18'),
      weather: DprWeather.Clear,
      labourCount: 10,
      skilledLabourCount: 6,
      unskilledLabourCount: 4,
      photoDocumentIds: [new Types.ObjectId()],
      siteCashBalance: 40_000,
      status: DprStatus.Submitted,
    });

    await connection.model(StockReorderAlert.name).create({
      projectId: projectOid,
      materialId: new Types.ObjectId(),
      materialCode: 'CEM',
      materialName: 'Cement',
      alertType: StockReorderAlertType.BelowReorderLevel,
      status: StockReorderAlertStatus.Open,
      message: 'Low cement',
      availableStock: 5,
      pendingPoQuantity: 0,
      averageDailyConsumption: 2,
      reorderLevel: 20,
      recommendedPurchaseQuantity: 40,
      baseUnit: MaterialUnit.Bag,
      evaluatedAt: new Date('2026-07-20'),
    });

    await connection.model(ManpowerShortfallAlert.name).create({
      projectId: projectOid,
      contractorId,
      asOfDate: new Date('2026-07-19'),
      alertType: ManpowerShortfallAlertType.Below80TwoConsecutiveDays,
      message: 'Shortfall',
      shortfallPercent: 30,
      consecutiveDays: 2,
      agreementHeadcount: 20,
      plannedHeadcount: 20,
      actualHeadcount: 14,
      expectedScheduleImpactDays: 2,
      recommendedEscalation: ManpowerEscalation.ProjectManager,
      acknowledged: false,
    });

    await connection.model(DprMissingAlert.name).create({
      projectId: projectOid,
      reportDate: new Date('2026-07-19'),
      message: 'Missing DPR',
      acknowledged: false,
    });

    await connection.model(PurchaseRequest.name).create({
      requestNumber: 'PR-PD-001',
      projectId: projectOid,
      requestedBy: new Types.ObjectId(),
      requiredByDate: new Date('2026-07-28'),
      justification: 'Steel',
      priority: PurchaseRequestPriority.High,
      status: PurchaseRequestStatus.Submitted,
      items: [
        {
          materialId: new Types.ObjectId(),
          requestedQuantity: 5,
          unit: MaterialUnit.Ton,
        },
      ],
    });
  });

  it('returns project dashboard with costs, funding, ops and drill-downs', async () => {
    const res = await service.getDashboard(projectId, {
      date: '2026-07-20',
      from: '2026-04-01',
      to: '2026-07-20',
    });

    expect(res.success).toBe(true);
    const data = res.data!;

    expect(data.project.projectCode).toBe('PRJ-PD-001');
    expect(data.projectStage.stage).toBe(ProjectStage.Structure);
    expect(data.physicalCompletion.percent).toBe(50);
    expect(data.approvedBudget.amount).toBe(12_000_000);
    expect(data.revisedBudget.amount).toBe(11_500_000);

    // actual = vendor 236k + contractor 400k
    expect(data.actualCost.amount).toBe(636_000);
    expect(data.committedCost.amount).toBe(80_000);
    expect(data.forecastCostToComplete.amount).toBe(
      11_500_000 - 636_000 - 80_000,
    );
    expect(data.projectedFinalCost.amount).toBe(11_500_000);
    expect(data.financialCompletion.percent).toBeGreaterThan(0);

    expect(data.customerCollections.amount).toBe(750_000);
    expect(data.investorFunding.committedAmount).toBe(3_000_000);
    expect(data.investorFunding.receivedAmount).toBe(1_500_000);

    expect(data.bankBalance.amount).toBe(2_500_000);
    expect(data.cashBalance.amount).toBe(45_000);
    expect(data.materialStock.materialCount).toBe(1);
    expect(data.materialStock.totalQuantity).toBe(120);

    expect(data.labourAttendance.totalWorkers).toBe(18);
    expect(data.labourAttendance.confirmedSheets).toBe(1);

    expect(data.contractorProgress[0].progressPercent).toBe(50);
    expect(data.vendorDues.amount).toBe(200_000);
    expect(data.purchaseOrders.openBalance).toBe(80_000);
    expect(data.sitePhotos.count).toBeGreaterThanOrEqual(1);

    const codes = data.criticalAlerts.map((a) => a.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'MATERIAL_STOCK',
        'LABOUR_SHORTFALL',
        'MISSING_DPR',
        'VENDOR_DUES',
        'PR_PENDING',
      ]),
    );

    expect(data.actualCost.drillDown[0].href).toMatch(/^\/api\/v1\//);
    expect(data.filters.from).toContain('2026-04-01');
  });

  it('rejects invalid project id', async () => {
    await expect(service.getDashboard('not-an-id', {})).rejects.toThrow(
      'Invalid projectId',
    );
  });

  it('rejects unknown project', async () => {
    await expect(
      service.getDashboard(new Types.ObjectId().toHexString(), {}),
    ).rejects.toThrow('Project not found');
  });
});
