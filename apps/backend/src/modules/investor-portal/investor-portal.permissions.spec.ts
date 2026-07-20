import { ForbiddenException } from '@nestjs/common';
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
  ContractorBill,
  ContractorBillSchema,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  ContributionPaymentMode,
  ContributionReceipt,
  ContributionReceiptSchema,
  ContributionReceiptStatus,
} from '../contribution-receipts/schemas/contribution-receipt.schema';
import {
  Investor,
  InvestorKycStatus,
  InvestorSchema,
  InvestorStatus,
  InvestorType,
} from '../investors/schemas/investor.schema';
import {
  CommitmentStatus,
  ContributionCommitment,
  ContributionCommitmentSchema,
  ContributionType,
} from '../project-commitments/schemas/contribution-commitment.schema';
import {
  ParticipantDocumentCategory,
  ProjectParticipantFile,
  ProjectParticipantFileSchema,
} from '../project-participants/schemas/project-participant-document.schema';
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
  ProjectStage,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { ROLE_SEEDS } from '../rbac/role.seed';
import { isKnownPermission } from '../rbac/permissions.catalog';
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
import { InvestorPortalService } from './investor-portal.service';
import {
  InvestorProfitAllocation,
  InvestorProfitAllocationSchema,
  InvestorProfitAllocationStatus,
} from './schemas/investor-profit-allocation.schema';
import {
  InvestorVisibleReport,
  InvestorVisibleReportSchema,
  InvestorVisibleReportStatus,
  InvestorVisibleReportType,
} from './schemas/investor-visible-report.schema';

describe('InvestorPortalService permissions & restrictions', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: InvestorPortalService;

  let investorUserA: string;
  let investorUserB: string;
  let investorAId: Types.ObjectId;
  let investorBId: Types.ObjectId;
  let projectAId: string;
  let projectBId: string;
  let participantAId: Types.ObjectId;
  let participantBId: Types.ObjectId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    service = new InvestorPortalService(
      connection.model(Investor.name, InvestorSchema) as Model<Investor>,
      connection.model(
        ProjectParticipant.name,
        ProjectParticipantSchema,
      ) as Model<ProjectParticipant>,
      connection.model(
        ContributionCommitment.name,
        ContributionCommitmentSchema,
      ) as Model<ContributionCommitment>,
      connection.model(
        ContributionReceipt.name,
        ContributionReceiptSchema,
      ) as Model<ContributionReceipt>,
      connection.model(
        ProjectParticipantFile.name,
        ProjectParticipantFileSchema,
      ) as Model<ProjectParticipantFile>,
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
        InvestorVisibleReport.name,
        InvestorVisibleReportSchema,
      ) as Model<InvestorVisibleReport>,
      connection.model(
        InvestorProfitAllocation.name,
        InvestorProfitAllocationSchema,
      ) as Model<InvestorProfitAllocation>,
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

    investorUserA = new Types.ObjectId().toHexString();
    investorUserB = new Types.ObjectId().toHexString();

    const [invA] = await connection.model(Investor.name).create([
      {
        investorCode: 'INV-A-001',
        investorType: InvestorType.Individual,
        legalName: 'Investor Alpha',
        userId: new Types.ObjectId(investorUserA),
        status: InvestorStatus.Active,
        kycStatus: InvestorKycStatus.Verified,
      },
    ]);
    const [invB] = await connection.model(Investor.name).create([
      {
        investorCode: 'INV-B-001',
        investorType: InvestorType.Individual,
        legalName: 'Investor Beta',
        userId: new Types.ObjectId(investorUserB),
        status: InvestorStatus.Active,
        kycStatus: InvestorKycStatus.Verified,
      },
    ]);
    investorAId = invA._id as Types.ObjectId;
    investorBId = invB._id as Types.ObjectId;

    const [projectA] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-INV-A',
        projectName: 'Alpha Heights',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site A',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        projectStage: ProjectStage.Structure,
        approvedBudget: 20_000_000,
        companyId: new Types.ObjectId(),
      },
    ]);
    const [projectB] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-INV-B',
        projectName: 'Beta Towers',
        projectType: ProjectType.Commercial,
        address: {
          line1: 'Site B',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
          country: 'India',
        },
        status: ProjectStatus.Construction,
        projectStage: ProjectStage.Finishing,
        approvedBudget: 15_000_000,
        companyId: new Types.ObjectId(),
      },
    ]);
    projectAId = String(projectA._id);
    projectBId = String(projectB._id);

    const [partA] = await connection.model(ProjectParticipant.name).create([
      {
        projectId: projectA._id,
        participantType: ParticipantType.OutsideInvestor,
        participantId: investorAId,
        participantKey: `outside_investor:${String(investorAId)}`,
        participantLabel: 'Investor Alpha',
        commitmentAmount: 5_000_000,
        expectedContributionDate: new Date('2026-06-01'),
        actualContributionAmount: 2_000_000,
        approvedProfitSharePercentage: 25,
        lossSharePercentage: 25,
        interestRate: null,
        instrumentType: InstrumentType.ProjectInvestment,
        effectiveFrom: new Date('2026-04-01'),
        effectiveTo: null,
        status: ParticipantApprovalStatus.Approved,
        version: 1,
      },
    ]);
    participantAId = partA._id as Types.ObjectId;

    // Co-investor on same project A (must never leak to investor A portal)
    await connection.model(ProjectParticipant.name).create({
      projectId: projectA._id,
      participantType: ParticipantType.OutsideInvestor,
      participantId: investorBId,
      participantKey: `outside_investor:${String(investorBId)}`,
      participantLabel: 'Investor Beta',
      commitmentAmount: 8_000_000,
      expectedContributionDate: new Date('2026-06-01'),
      actualContributionAmount: 4_000_000,
      approvedProfitSharePercentage: 40,
      lossSharePercentage: 40,
      interestRate: null,
      instrumentType: InstrumentType.ProjectInvestment,
      effectiveFrom: new Date('2026-04-01'),
      effectiveTo: null,
      status: ParticipantApprovalStatus.Approved,
      version: 1,
    });

    const [partB] = await connection.model(ProjectParticipant.name).create([
      {
        projectId: projectB._id,
        participantType: ParticipantType.OutsideInvestor,
        participantId: investorBId,
        participantKey: `outside_investor:${String(investorBId)}`,
        participantLabel: 'Investor Beta',
        commitmentAmount: 3_000_000,
        expectedContributionDate: new Date('2026-06-01'),
        actualContributionAmount: 1_000_000,
        approvedProfitSharePercentage: 15,
        lossSharePercentage: 15,
        interestRate: null,
        instrumentType: InstrumentType.ProjectInvestment,
        effectiveFrom: new Date('2026-04-01'),
        effectiveTo: null,
        status: ParticipantApprovalStatus.Approved,
        version: 1,
      },
    ]);
    participantBId = partB._id as Types.ObjectId;

    await connection.model(ContributionCommitment.name).create({
      projectId: projectA._id,
      participantId: participantAId,
      commitmentNumber: 'COM-INV-A-001',
      commitmentAmount: 5_000_000,
      commitmentDate: new Date('2026-05-01'),
      contributionType: ContributionType.Capital,
      receivedAmount: 2_000_000,
      status: CommitmentStatus.Approved,
      version: 1,
    });

    await connection.model(ContributionReceipt.name).create([
      {
        receiptNumber: 'CR-INV-A-001',
        projectId: projectA._id,
        participantId: participantAId,
        commitmentId: new Types.ObjectId(),
        receivedDate: new Date('2026-06-15'),
        amount: 2_000_000,
        paymentMode: ContributionPaymentMode.BankTransfer,
        status: ContributionReceiptStatus.Posted,
        receiptDocument: 'uploads/receipts/a.pdf',
      },
      {
        receiptNumber: 'CR-INV-B-001',
        projectId: projectA._id,
        participantId: new Types.ObjectId(), // foreign — must not appear for A
        commitmentId: new Types.ObjectId(),
        receivedDate: new Date('2026-06-16'),
        amount: 4_000_000,
        paymentMode: ContributionPaymentMode.BankTransfer,
        status: ContributionReceiptStatus.Posted,
      },
    ]);

    await connection.model(ProjectParticipantFile.name).create({
      participantRecordId: participantAId,
      projectId: projectA._id,
      fileName: 'alpha-agreement.pdf',
      filePath: 'uploads/agreements/alpha.pdf',
      mimeType: 'application/pdf',
      category: ParticipantDocumentCategory.Agreement,
    });

    await connection.model(BoqVersion.name).create({
      projectId: projectA._id,
      versionNumber: 1,
      versionType: BoqVersionType.Original,
      effectiveDate: new Date('2026-04-01'),
      reason: 'Baseline',
      costImpact: 0,
      timeImpact: 0,
      status: BoqVersionStatus.Active,
      totalPlannedValue: 18_000_000,
    });

    await connection.model(WorkMeasurement.name).create({
      measurementNumber: 'WM-INV-001',
      projectId: projectA._id,
      contractorId: new Types.ObjectId(),
      boqItemId: new Types.ObjectId(),
      location: 'Block A',
      measurementDate: new Date('2026-07-01'),
      previousQuantity: 0,
      currentQuantity: 30,
      cumulativeQuantity: 30,
      unit: BoqUnit.CubicMetre,
      measuredBy: new Types.ObjectId(),
      status: WorkMeasurementStatus.Verified,
      boqPlannedQuantity: 100,
    });

    await connection.model(VendorInvoice.name).create({
      documentNumber: 'VI-INV-001',
      invoiceNumber: 'SECRET-VENDOR-INV',
      vendorId: new Types.ObjectId(),
      projectId: projectA._id,
      purchaseOrderId: new Types.ObjectId(),
      invoiceDate: new Date('2026-07-01'),
      dueDate: new Date('2026-07-31'),
      taxableValue: 500_000,
      gst: 90_000,
      tds: 0,
      retention: 0,
      freight: 0,
      discount: 0,
      totalAmount: 590_000,
      paidAmount: 0,
      items: [],
      matchingStatus: VendorInvoiceMatchingStatus.Matched,
      status: VendorInvoiceStatus.Posted,
    });

    await connection.model(ContractorBill.name).create({
      billNumber: 'CB-INV-001',
      raNumber: 1,
      contractorId: new Types.ObjectId(),
      projectId: projectA._id,
      agreementId: new Types.ObjectId(),
      billingPeriod: {
        from: new Date('2026-06-01'),
        to: new Date('2026-06-30'),
      },
      measurements: [],
      previousCertifiedValue: 0,
      currentCertifiedValue: 410_000,
      cumulativeValue: 410_000,
      advanceRecovery: 0,
      materialRecovery: 0,
      retention: 0,
      tds: 0,
      penalty: 0,
      otherDeductions: 0,
      netPayable: 410_000,
      paidAmount: 0,
      status: ContractorBillStatus.Posted,
      postedAt: new Date('2026-07-05'),
    });

    await connection.model(InvestorVisibleReport.name).create({
      projectId: projectA._id,
      title: 'Q1 Investor Update',
      reportType: InvestorVisibleReportType.Progress,
      summary: 'Structure 30% complete',
      status: InvestorVisibleReportStatus.Published,
      publishedAt: new Date('2026-07-10'),
    });

    await connection.model(InvestorProfitAllocation.name).create({
      projectId: projectA._id,
      participantId: participantAId,
      investorId: investorAId,
      allocatedAmount: 500_000,
      distributedAmount: 150_000,
      status: InvestorProfitAllocationStatus.Approved,
      approvedAt: new Date('2026-07-01'),
    });
  });

  it('registers investor_portal permissions and restricts INVESTOR role', () => {
    expect(isKnownPermission('investor_portal.view')).toBe(true);
    expect(isKnownPermission('investor_portal.manage')).toBe(true);

    const investorRole = ROLE_SEEDS.find((r) => r.code === 'INVESTOR');
    expect(investorRole?.permissions).toContain('investor_portal.view');
    expect(investorRole?.permissions).not.toContain('dashboard.view');
    expect(investorRole?.permissions).not.toContain('project.view');
    expect(investorRole?.permissions).not.toContain('investor.view_all');
    expect(investorRole?.permissions).not.toContain('vendor.view');
    expect(investorRole?.permissions).not.toContain('customer.view');
  });

  it('lists only authorised projects for the linked investor', async () => {
    const listA = await service.listProjects(investorUserA);
    expect(listA.data).toHaveLength(1);
    expect(listA.data?.[0]?.projectId).toBe(projectAId);
    expect(listA.data?.[0]?.commitmentAmount).toBe(5_000_000);
    expect(listA.data?.[0]?.amountContributed).toBe(2_000_000);
    expect(listA.data?.[0]?.pendingContribution).toBe(3_000_000);

    const listB = await service.listProjects(investorUserB);
    expect(listB.data?.map((p) => p.projectId).sort()).toEqual(
      [projectAId, projectBId].sort(),
    );
  });

  it('denies project detail when investor is not a participant', async () => {
    await expect(
      service.getProject(projectBId, investorUserA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies portal when user has no linked investor', async () => {
    await expect(
      service.listProjects(new Types.ObjectId().toHexString()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns own investment detail without other investors or PII', async () => {
    const res = await service.getProject(projectAId, investorUserA);
    const data = res.data!;

    expect(data.investment.commitmentAmount).toBe(5_000_000);
    expect(data.investment.amountContributed).toBe(2_000_000);
    expect(data.investment.pendingContribution).toBe(3_000_000);
    expect(data.investment.approvedProfitSharePercentage).toBe(25);
    expect(data.progress.physicalProgressPercent).toBe(30);
    expect(data.budget.revisedBudget).toBe(18_000_000);
    expect(data.budget.fundsUtilised).toBe(1_000_000);
    expect(data.profit.distributedProfit).toBe(150_000);
    expect(data.profit.undistributedProfit).toBe(350_000);
    expect(data.reports).toHaveLength(1);
    expect(data.agreements[0].fileName).toBe('alpha-agreement.pdf');
    expect(data.receipts).toHaveLength(1);
    expect(data.receipts[0].receiptNumber).toBe('CR-INV-A-001');

    expect(data.restrictions).toEqual({
      otherInvestorsVisible: false,
      companyFinancialsVisible: false,
      vendorPersonalDataVisible: false,
      customerPersonalDataVisible: false,
    });

    const json = JSON.stringify(data);
    expect(json).not.toContain('Investor Beta');
    expect(json).not.toContain(String(investorBId));
    expect(json).not.toContain(String(participantBId));
    expect(json).not.toContain('CR-INV-B-001');
    expect(json).not.toContain('SECRET-VENDOR-INV');
    expect(json).not.toContain('vendorId');
    expect(json).not.toContain('customerId');
    expect(json).not.toContain('bankBalance');
    expect(json).not.toContain('companyBank');
  });

  it('staff can publish reports and record profit for a participant', async () => {
    const staffId = new Types.ObjectId().toHexString();
    const published = await service.publishReport(
      {
        projectId: projectAId,
        title: 'Board packet',
        reportType: InvestorVisibleReportType.BoardUpdate,
        summary: 'Safe summary',
      },
      staffId,
    );
    expect(published.data?.status).toBe(InvestorVisibleReportStatus.Published);

    const profit = await service.recordProfitAllocation(
      {
        projectId: projectAId,
        participantId: String(participantAId),
        allocatedAmount: 100_000,
        distributedAmount: 25_000,
      },
      staffId,
    );
    expect(profit.data?.undistributedAmount).toBe(75_000);

    const detail = await service.getProject(projectAId, investorUserA);
    expect(detail.data?.reports.some((r) => r.title === 'Board packet')).toBe(
      true,
    );
    expect(detail.data?.profit.allocatedAmount).toBe(600_000);
  });
});
