import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { ProjectCommitmentsService } from '../project-commitments/project-commitments.service';
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
import { ContributionReceiptPdfService } from './contribution-receipt-pdf.service';
import { ContributionReceiptsService } from './contribution-receipts.service';
import {
  ParticipantContributionBalance,
  ParticipantContributionBalanceSchema,
  ProjectContributionBalance,
  ProjectContributionBalanceSchema,
} from './schemas/contribution-balance.schema';
import {
  ContributionPaymentMode,
  ContributionReceipt,
  ContributionReceiptSchema,
  ContributionReceiptStatus,
} from './schemas/contribution-receipt.schema';

describe('ContributionReceiptsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let receiptModel: Model<ContributionReceipt>;
  let commitmentModel: Model<ContributionCommitment>;
  let service: ContributionReceiptsService;
  let projectId: string;
  let participantId: string;
  let commitmentId: string;
  const bankAccountId = new Types.ObjectId().toHexString();
  const actorA = new Types.ObjectId().toHexString();
  const actorB = new Types.ObjectId().toHexString();
  const actorC = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    receiptModel = connection.model(
      ContributionReceipt.name,
      ContributionReceiptSchema,
    ) as Model<ContributionReceipt>;
    const projectBalanceModel = connection.model(
      ProjectContributionBalance.name,
      ProjectContributionBalanceSchema,
    ) as Model<ProjectContributionBalance>;
    const participantBalanceModel = connection.model(
      ParticipantContributionBalance.name,
      ParticipantContributionBalanceSchema,
    ) as Model<ParticipantContributionBalance>;
    const projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    const participantModel = connection.model(
      ProjectParticipant.name,
      ProjectParticipantSchema,
    ) as Model<ProjectParticipant>;
    commitmentModel = connection.model(
      ContributionCommitment.name,
      ContributionCommitmentSchema,
    ) as Model<ContributionCommitment>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;

    await Promise.all([
      receiptModel.syncIndexes(),
      projectBalanceModel.syncIndexes(),
      participantBalanceModel.syncIndexes(),
      projectModel.syncIndexes(),
      participantModel.syncIndexes(),
      commitmentModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    const numbering = new NumberingService(counterModel);
    const commitmentsService = new ProjectCommitmentsService(
      commitmentModel,
      projectModel,
      participantModel,
      numbering,
    );
    const financialYearService = {
      assertPostingAllowed: jest.fn().mockResolvedValue({}),
    } as unknown as FinancialYearService;

    service = new ContributionReceiptsService(
      receiptModel,
      projectBalanceModel,
      participantBalanceModel,
      projectModel,
      participantModel,
      commitmentModel,
      numbering,
      new IdempotencyService(idempotencyModel),
      commitmentsService,
      new ContributionReceiptPdfService(),
      financialYearService,
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
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await receiptModel.deleteMany({}).setOptions({ withDeleted: true });
    await commitmentModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(ProjectContributionBalance.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(ParticipantContributionBalance.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Project.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(ProjectParticipant.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection
      .model(IdempotencyKey.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-2026-0001',
        projectName: 'Skyline Residences',
        projectType: ProjectType.Residential,
        address: {
          line1: 'Site',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600002',
          country: 'India',
        },
        status: ProjectStatus.Planning,
      },
    ]);
    projectId = String(project._id);

    const [participant] = await connection.model(ProjectParticipant.name).create([
      {
        projectId: project._id,
        participantType: ParticipantType.Director,
        participantId: new Types.ObjectId(),
        participantKey: 'director:test',
        participantLabel: 'Director A',
        commitmentAmount: 5_000_000,
        actualContributionAmount: 0,
        approvedProfitSharePercentage: 100,
        lossSharePercentage: 100,
        interestRate: null,
        instrumentType: InstrumentType.ProjectInvestment,
        effectiveFrom: new Date(),
        effectiveTo: null,
        status: ParticipantApprovalStatus.Approved,
        version: 1,
      },
    ]);
    participantId = String(participant._id);

    const [commitment] = await commitmentModel.create([
      {
        projectId: project._id,
        participantId: participant._id,
        commitmentNumber: 'COM-2026-000001',
        commitmentAmount: 1_000_000,
        commitmentDate: new Date('2026-01-01'),
        dueDate: new Date('2026-12-31'),
        contributionType: ContributionType.Capital,
        paymentSchedule: [],
        expectedBankAccount: {},
        status: CommitmentStatus.Approved,
        version: 1,
        receivedAmount: 0,
        receipts: [],
      },
    ]);
    commitmentId = String(commitment._id);
  });

  async function createPosted(amount = 250_000, txnRef = 'NEFT-UNIQUE-1') {
    const created = await service.create(
      projectId,
      {
        participantId,
        commitmentId,
        amount,
        paymentMode: ContributionPaymentMode.BankTransfer,
        bankAccountId,
        transactionReference: txnRef,
        receivedDate: '2026-07-01',
      },
      actorA,
    );
    await service.submit(projectId, created.data!.id, actorA);
    await service.verify(projectId, created.data!.id, actorB);
    return service.post(projectId, created.data!.id, actorC);
  }

  it('runs Draft → Submitted → Verified → Posted with PDF and balances', async () => {
    const posted = await createPosted(300_000, 'NEFT-FLOW-1');
    expect(posted.data?.status).toBe(ContributionReceiptStatus.Posted);
    expect(posted.data?.receiptNumber).toMatch(/^CTR-\d{4}-\d{6}$/);
    expect(posted.data?.balancesApplied).toBe(true);
    expect(posted.data?.journalEntryId).toBeNull();
    expect(posted.data?.accountingNote).toMatch(/accounting entries later/i);
    expect(posted.data?.receiptPdfPath).toBeTruthy();

    const absolute = join(process.cwd(), posted.data!.receiptPdfPath!);
    expect(existsSync(absolute)).toBe(true);

    const balances = await service.getBalances(projectId, participantId);
    expect(balances.data?.project.receivedAmount).toBe(300_000);
    expect(balances.data?.participant?.receivedAmount).toBe(300_000);

    const commitment = await commitmentModel.findById(commitmentId).lean();
    expect(commitment?.receivedAmount).toBe(300_000);
  });

  it('replays create with the same Idempotency-Key', async () => {
    const key = 'idem-receipt-001';
    const first = await service.create(
      projectId,
      {
        participantId,
        commitmentId,
        amount: 100_000,
        paymentMode: ContributionPaymentMode.Cash,
      },
      actorA,
      key,
    );
    const second = await service.create(
      projectId,
      {
        participantId,
        commitmentId,
        amount: 100_000,
        paymentMode: ContributionPaymentMode.Cash,
      },
      actorA,
      key,
    );
    expect(second).toEqual(first);
    expect(await receiptModel.countDocuments({})).toBe(1);
  });

  it('prevents duplicate transaction references on the same bank account', async () => {
    await service.create(
      projectId,
      {
        participantId,
        commitmentId,
        amount: 50_000,
        paymentMode: ContributionPaymentMode.BankTransfer,
        bankAccountId,
        transactionReference: 'DUP-REF-99',
      },
      actorA,
    );

    await expect(
      service.create(
        projectId,
        {
          participantId,
          commitmentId,
          amount: 10_000,
          paymentMode: ContributionPaymentMode.BankTransfer,
          bankAccountId,
          transactionReference: 'DUP-REF-99',
        },
        actorA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces segregation of submit / verify / post actors', async () => {
    const created = await service.create(
      projectId,
      {
        participantId,
        commitmentId,
        amount: 40_000,
        paymentMode: ContributionPaymentMode.Cash,
      },
      actorA,
    );
    await service.submit(projectId, created.data!.id, actorA);

    await expect(
      service.verify(projectId, created.data!.id, actorA),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.verify(projectId, created.data!.id, actorB);
    await expect(
      service.post(projectId, created.data!.id, actorB),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
