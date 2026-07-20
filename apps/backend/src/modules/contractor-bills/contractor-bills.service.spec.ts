import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { ClientSession, Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import { DatabaseService } from '../../database/services/database.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { BoqUnit } from '../boq/schemas/boq.schema';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  ContractorAgreement,
  ContractorAgreementBillingCycle,
  ContractorAgreementSchema,
  ContractorAgreementStatus,
} from '../contractor-agreements/schemas/contractor-agreement.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { JournalService } from '../journal/journal.service';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalPartyType,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import {
  WorkMeasurement,
  WorkMeasurementSchema,
  WorkMeasurementStatus,
} from '../work-measurements/schemas/work-measurement.schema';
import { ContractorBillsService } from './contractor-bills.service';
import {
  ContractorBill,
  ContractorBillSchema,
  ContractorBillStatus,
} from './schemas/contractor-bill.schema';

describe('ContractorBillsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ContractorBillsService;
  let billModel: Model<ContractorBill>;
  let agreementModel: Model<ContractorAgreement>;
  let measurementModel: Model<WorkMeasurement>;
  let accountModel: Model<Account>;
  let journalModel: Model<JournalEntry>;
  let journalService: { create: jest.Mock; post: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let financialYearService: { assertPostingAllowed: jest.Mock };

  let actorId: string;
  let engineerId: string;
  let projectId: string;
  let contractorId: string;
  let agreementId: string;
  let boqItemId: string;
  let measurementId: string;
  let wipId: string;
  let payableId: string;
  let retentionId: string;
  let tdsId: string;
  let advanceId: string;
  let materialRecoveryId: string;
  let penaltyRecoveryId: string;
  let otherDeductionId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    billModel = connection.model(
      ContractorBill.name,
      ContractorBillSchema,
    ) as Model<ContractorBill>;
    agreementModel = connection.model(
      ContractorAgreement.name,
      ContractorAgreementSchema,
    ) as Model<ContractorAgreement>;
    measurementModel = connection.model(
      WorkMeasurement.name,
      WorkMeasurementSchema,
    ) as Model<WorkMeasurement>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;

    await Promise.all([
      billModel.syncIndexes(),
      agreementModel.syncIndexes(),
      measurementModel.syncIndexes(),
      projectModel.syncIndexes(),
      contractorModel.syncIndexes(),
      accountModel.syncIndexes(),
      journalModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    financialYearService = {
      assertPostingAllowed: jest.fn().mockResolvedValue({}),
    };
    journalService = {
      create: jest.fn(),
      post: jest.fn(),
    };
    auditLogService = {
      record: jest.fn().mockResolvedValue({}),
    };
    const databaseService = {
      withTransaction: async <T>(
        work: (session: ClientSession) => Promise<T>,
      ): Promise<T> => {
        const session = await connection.startSession();
        try {
          return await work(session);
        } finally {
          await session.endSession();
        }
      },
    } as unknown as DatabaseService;
    const mockProjectScope = {
      assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
      assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
      assertOwnedResource: jest.fn().mockResolvedValue(undefined),
      mergeAuthorisedProjectFilter: jest
        .fn()
        .mockImplementation(async (_a, f) => f),
      findOneForActor: jest.fn(),
      buildScopedIdFilter: jest.fn(),
      authorisedProjectMatchStage: jest.fn().mockResolvedValue({}),
    } as never;


    service = new ContractorBillsService(
      billModel,
      agreementModel,
      measurementModel,
      projectModel,
      contractorModel,
      accountModel,
      journalModel,
      new NumberingService(counterModel),
      journalService as unknown as JournalService,
      financialYearService as unknown as FinancialYearService,
      new IdempotencyService(idempotencyModel),
      databaseService,
      auditLogService as unknown as AuditLogService,
      mockProjectScope,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    engineerId = new Types.ObjectId().toHexString();
    boqItemId = new Types.ObjectId().toHexString();

    await billModel.deleteMany({}).setOptions({ withDeleted: true });
    await agreementModel.deleteMany({}).setOptions({ withDeleted: true });
    await measurementModel.deleteMany({}).setOptions({ withDeleted: true });
    await journalModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Project.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Contractor.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection
      .model(IdempotencyKey.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });

    jest.clearAllMocks();
    financialYearService.assertPostingAllowed.mockResolvedValue({});
    auditLogService.record.mockResolvedValue({});

    const [wip, payable, retention, tds, advance, material, penalty, otherDed] =
      await accountModel.create([
        {
          accountCode: '1150',
          accountName: 'WIP',
          accountType: AccountType.Asset,
          accountCategory: AccountCategory.WorkInProgress,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '2120',
          accountName: 'Contractor Payable',
          accountType: AccountType.Liability,
          accountCategory: AccountCategory.ContractorPayable,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          requiresParty: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '2170',
          accountName: 'Retention Payable',
          accountType: AccountType.Liability,
          accountCategory: AccountCategory.RetentionPayable,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          requiresParty: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '2160',
          accountName: 'TDS Payable',
          accountType: AccountType.Liability,
          accountCategory: AccountCategory.TdsPayable,
          level: 2,
          allowManualPosting: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '1160',
          accountName: 'Contractor Advance',
          accountType: AccountType.Asset,
          accountCategory: AccountCategory.ContractorAdvance,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          requiresParty: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '4210',
          accountName: 'Material Recovery',
          accountType: AccountType.Income,
          accountCategory: AccountCategory.MaterialRecovery,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          requiresParty: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '4220',
          accountName: 'Penalty Recovery',
          accountType: AccountType.Income,
          accountCategory: AccountCategory.PenaltyRecovery,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          requiresParty: true,
          status: AccountStatus.Active,
        },
        {
          accountCode: '4230',
          accountName: 'Other Contractor Deduction',
          accountType: AccountType.Income,
          accountCategory: AccountCategory.OtherContractorDeduction,
          level: 2,
          allowManualPosting: true,
          requiresProject: true,
          status: AccountStatus.Active,
        },
      ]);
    wipId = String(wip._id);
    payableId = String(payable._id);
    retentionId = String(retention._id);
    tdsId = String(tds._id);
    advanceId = String(advance._id);
    materialRecoveryId = String(material._id);
    penaltyRecoveryId = String(penalty._id);
    otherDeductionId = String(otherDed._id);

    journalService.create.mockImplementation(
      async (dto: {
        sourceEntityId?: string | null;
        postingPurpose?: string | null;
        lines: Array<{
          debit?: number;
          credit?: number;
          accountId: string;
          partyId?: string;
          projectId?: string;
        }>;
      }) => {
        const journalId = new Types.ObjectId();
        const totalDebit = dto.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
        const totalCredit = dto.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
        await journalModel.create({
          _id: journalId,
          journalNumber: `JE-MOCK-${journalId.toHexString().slice(-6)}`,
          journalDate: new Date('2026-07-20'),
          financialYearId: new Types.ObjectId(),
          projectId: new Types.ObjectId(projectId),
          sourceModule: 'contractor_bill',
          sourceEntityType: 'contractor_bill',
          sourceEntityId: dto.sourceEntityId ?? null,
          postingPurpose: dto.postingPurpose ?? 'ap_recognition',
          narration: 'mock',
          status: JournalStatus.Posted,
          totalDebit,
          totalCredit,
          lines: dto.lines.map((l) => ({
            accountId: new Types.ObjectId(l.accountId),
            debit: l.debit ?? 0,
            credit: l.credit ?? 0,
            projectId: l.projectId
              ? new Types.ObjectId(l.projectId)
              : new Types.ObjectId(projectId),
            partyId: l.partyId ? new Types.ObjectId(l.partyId) : null,
          })),
          createdBy: new Types.ObjectId(actorId),
        });
        return {
          success: true,
          message: 'ok',
          data: { id: String(journalId) },
        };
      },
    );

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-CB-001',
        projectName: 'RA Bill Tower',
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
    projectId = String(project._id);

    const [contractor] = await connection.model(Contractor.name).create([
      {
        contractorCode: 'CON-000301',
        legalName: 'RA Civil Works',
        contractorType: ContractorType.Civil,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: [],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);

    const [agreement] = await agreementModel.create([
      {
        agreementNumber: 'CA-2026-000301',
        version: 1,
        contractorId: new Types.ObjectId(contractorId),
        projectId: new Types.ObjectId(projectId),
        workScope: 'Civil works',
        boqItems: [
          {
            boqItemId: new Types.ObjectId(boqItemId),
            boqCode: 'RCC-001',
            description: 'RCC columns',
            unit: BoqUnit.CubicMetre,
            agreedQuantity: 100,
            agreedRate: 1000,
            agreedValue: 100000,
          },
        ],
        agreedRatesTotal: 100000,
        agreedQuantity: 100,
        manpowerCommitment: 20,
        skillMix: [],
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        billingCycle: ContractorAgreementBillingCycle.Monthly,
        advance: { amount: 50000, terms: 'Against BG' },
        recoveryPlan: { method: 'percent_per_bill', percentPerBill: 20 },
        retentionPercentage: 5,
        status: ContractorAgreementStatus.Active,
      },
    ]);
    agreementId = String(agreement._id);

    const advanceJournalId = new Types.ObjectId();
    await journalModel.create({
      _id: advanceJournalId,
      journalNumber: `JE-ADV-${advanceJournalId.toHexString().slice(-6)}`,
      journalDate: new Date('2026-06-01'),
      financialYearId: new Types.ObjectId(),
      projectId: new Types.ObjectId(projectId),
      sourceModule: 'contractor_agreement',
      sourceEntityType: 'contractor_agreement',
      sourceEntityId: agreementId,
      postingPurpose: 'advance_disbursement',
      narration: 'Mobilisation advance',
      status: JournalStatus.Posted,
      totalDebit: 50000,
      totalCredit: 50000,
      lines: [
        {
          accountId: new Types.ObjectId(advanceId),
          debit: 50000,
          credit: 0,
          projectId: new Types.ObjectId(projectId),
          partyType: JournalPartyType.Contractor,
          partyId: new Types.ObjectId(contractorId),
        },
        {
          accountId: new Types.ObjectId(),
          debit: 0,
          credit: 50000,
          projectId: new Types.ObjectId(projectId),
        },
      ],
      createdBy: new Types.ObjectId(actorId),
    });
    await agreementModel.updateOne(
      { _id: agreementId },
      {
        $set: {
          advanceDisbursementJournalId: advanceJournalId,
          advanceDisbursedAt: new Date('2026-06-01'),
        },
      },
    );

    const [measurement] = await measurementModel.create([
      {
        measurementNumber: 'WM-2026-000301',
        projectId: new Types.ObjectId(projectId),
        contractorId: new Types.ObjectId(contractorId),
        boqItemId: new Types.ObjectId(boqItemId),
        boqCode: 'RCC-001',
        location: 'Block A',
        measurementDate: new Date('2026-07-15T00:00:00.000Z'),
        previousQuantity: 0,
        currentQuantity: 10,
        cumulativeQuantity: 10,
        unit: BoqUnit.CubicMetre,
        measuredBy: new Types.ObjectId(actorId),
        verifiedBy: new Types.ObjectId(engineerId),
        verifiedAt: new Date(),
        status: WorkMeasurementStatus.Verified,
        submittedBy: new Types.ObjectId(actorId),
        submittedAt: new Date(),
        boqPlannedQuantity: 100,
      },
    ]);
    measurementId = String(measurement._id);
  });

  async function createDirectorApproved(overrides?: {
    tds?: number;
    penalty?: number;
    otherDeductions?: number;
    materialRecovery?: number;
  }) {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        invoiceDocument: 'doc-invoice-1',
        tds: overrides?.tds,
        penalty: overrides?.penalty,
        otherDeductions: overrides?.otherDeductions,
        materialRecovery: overrides?.materialRecovery,
      },
      actorId,
    );
    const id = created.data!.id;
    await service.submitClaim(id, actorId);
    await service.engineerVerify(id, {}, engineerId);
    await service.pmCertify(id, {}, actorId);
    await service.financeVerify(id, {}, actorId);
    await service.directorApprove(id, {}, actorId);
    return id;
  }

  it('creates RA bill with computed values and CB number', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        tds: 200,
        penalty: 100,
        otherDeductions: 50,
        materialRecovery: 150,
        invoiceDocument: 'doc-invoice-1',
      },
      actorId,
    );

    expect(created.data!.billNumber).toMatch(/^CB-/);
    expect(created.data!.raNumber).toBe(1);
    expect(created.data!.status).toBe(ContractorBillStatus.Draft);
    expect(created.data!.currentCertifiedValue).toBe(10000);
    expect(created.data!.retention).toBe(500);
    expect(created.data!.advanceRecovery).toBe(2000);
    expect(created.data!.netPayable).toBe(7000);
    expect(created.data!.journalEntryId).toBeNull();
  });

  it('posts approved bill with balanced AP journal and persists journalEntryId', async () => {
    const id = await createDirectorApproved({
      tds: 200,
      penalty: 100,
      otherDeductions: 50,
      materialRecovery: 150,
    });
    const posted = await service.post(id, actorId);

    expect(posted.data!.status).toBe(ContractorBillStatus.Posted);
    expect(posted.data!.journalEntryId).toBeTruthy();
    expect(posted.data!.netPayable).toBe(7000);

    expect(journalService.create).toHaveBeenCalledTimes(1);
    const dto = journalService.create.mock.calls[0][0];
    expect(dto.post).toBe(true);
    expect(dto.sourceModule).toBe('contractor_bill');
    expect(dto.sourceEntityId).toBe(id);
    expect(dto.projectId).toBe(projectId);

    const debit = dto.lines.reduce(
      (s: number, l: { debit?: number }) => s + (l.debit ?? 0),
      0,
    );
    const credit = dto.lines.reduce(
      (s: number, l: { credit?: number }) => s + (l.credit ?? 0),
      0,
    );
    expect(debit).toBe(credit);
    expect(debit).toBe(10000);

    expect(dto.lines.find((l: { accountId: string }) => l.accountId === wipId)?.debit).toBe(10000);
    const payableLine = dto.lines.find((l: { accountId: string }) => l.accountId === payableId);
    expect(payableLine?.credit).toBe(7000);
    expect(payableLine?.partyType).toBe(JournalPartyType.Contractor);
    expect(payableLine?.partyId).toBe(contractorId);
    expect(dto.lines.find((l: { accountId: string }) => l.accountId === retentionId)?.credit).toBe(500);
    expect(dto.lines.find((l: { accountId: string }) => l.accountId === tdsId)?.credit).toBe(200);
    expect(dto.lines.find((l: { accountId: string }) => l.accountId === advanceId)?.credit).toBe(2000);
    expect(dto.lines.find((l: { accountId: string }) => l.accountId === materialRecoveryId)?.credit).toBe(150);
    expect(dto.lines.find((l: { accountId: string }) => l.accountId === penaltyRecoveryId)?.credit).toBe(100);
    expect(dto.lines.find((l: { accountId: string }) => l.accountId === otherDeductionId)?.credit).toBe(50);

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'POST',
        module: 'contractor_bill',
        entityId: id,
        afterData: expect.objectContaining({
          journalEntryId: posted.data!.journalEntryId,
          netPayable: 7000,
        }),
      }),
    );
  });

  it('posts simple bill with no deductions to WIP and Contractor Payable only', async () => {
    await agreementModel.updateOne(
      { _id: agreementId },
      {
        $set: {
          retentionPercentage: 0,
          advance: { amount: 0, terms: null },
          recoveryPlan: { method: 'manual', percentPerBill: null },
        },
      },
    );
    const id = await createDirectorApproved();
    await service.post(id, actorId);
    const dto = journalService.create.mock.calls[0][0];
    expect(dto.lines).toHaveLength(2);
    expect(dto.lines[0].accountId).toBe(wipId);
    expect(dto.lines[0].debit).toBe(10000);
    expect(dto.lines[1].accountId).toBe(payableId);
    expect(dto.lines[1].credit).toBe(10000);
  });

  it('rejects posting when payable account mapping is missing', async () => {
    await accountModel.deleteMany({
      accountCategory: AccountCategory.ContractorPayable,
    });
    const id = await createDirectorApproved();
    await expect(service.post(id, actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const row = await billModel.findById(id).lean();
    expect(row?.status).toBe(ContractorBillStatus.DirectorApproved);
    expect(row?.journalEntryId).toBeNull();
  });

  it('rejects posting when financial year/period is closed', async () => {
    financialYearService.assertPostingAllowed.mockRejectedValue(
      new BadRequestException('Accounting period is closed'),
    );
    const id = await createDirectorApproved();
    await expect(service.post(id, actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(journalService.create).not.toHaveBeenCalled();
  });

  it('rejects posting from invalid status', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        invoiceDocument: 'doc-invoice-1',
      },
      actorId,
    );
    await expect(service.post(created.data!.id, actorId)).rejects.toThrow(
      /Cannot move bill/,
    );
  });

  it('is idempotent for already-posted bills', async () => {
    const id = await createDirectorApproved();
    const first = await service.post(id, actorId);
    const second = await service.post(id, actorId);
    expect(second.data!.journalEntryId).toBe(first.data!.journalEntryId);
    expect(journalService.create).toHaveBeenCalledTimes(1);
  });

  it('leaves bill unchanged when journal creation fails', async () => {
    journalService.create.mockRejectedValueOnce(
      new BadRequestException('Journal validation failed'),
    );
    const id = await createDirectorApproved();
    await expect(service.post(id, actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const row = await billModel.findById(id).lean();
    expect(row?.status).toBe(ContractorBillStatus.DirectorApproved);
    expect(row?.journalEntryId).toBeNull();
  });

  it('rejects update after posting (immutability)', async () => {
    const id = await createDirectorApproved();
    await service.post(id, actorId);
    await expect(
      service.update(id, { notes: 'should fail' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('runs full claim → paid workflow with journal on post', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        invoiceDocument: 'doc-invoice-1',
      },
      actorId,
    );
    const id = created.data!.id;
    await service.submitClaim(id, actorId);
    await expect(service.engineerVerify(id, {}, actorId)).rejects.toThrow(
      ForbiddenException,
    );
    await service.engineerVerify(id, {}, engineerId);
    await service.pmCertify(id, {}, actorId);
    await service.financeVerify(id, {}, actorId);
    await service.directorApprove(id, {}, actorId);

    const posted = await service.post(id, actorId);
    expect(posted.data!.status).toBe(ContractorBillStatus.Posted);
    expect(posted.data!.journalEntryId).toBeTruthy();

    const settled = await service.applyPaymentAllocation(
      id,
      posted.data!.netPayable,
      actorId,
    );
    expect(settled.status).toBe(ContractorBillStatus.Paid);
    expect(settled.paidAmount).toBe(posted.data!.netPayable);
    expect(String(settled.journalEntryId)).toBe(posted.data!.journalEntryId);
  });

  it('prevents double-billing the same measurement', async () => {
    await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
        invoiceDocument: 'doc-1',
      },
      actorId,
    );

    await expect(
      service.create(
        {
          projectId,
          contractorId,
          agreementId,
          billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
          measurementIds: [measurementId],
          invoiceDocument: 'doc-2',
        },
        actorId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects claim without invoice document', async () => {
    const created = await service.create(
      {
        projectId,
        contractorId,
        agreementId,
        billingPeriod: { from: '2026-07-01', to: '2026-07-31' },
        measurementIds: [measurementId],
      },
      actorId,
    );

    await expect(service.submitClaim(created.data!.id, actorId)).rejects.toThrow(
      /invoiceDocument/,
    );
  });
});
