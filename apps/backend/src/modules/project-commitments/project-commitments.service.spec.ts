import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  ParticipantApprovalStatus,
  ParticipantType,
  InstrumentType,
  ProjectParticipant,
  ProjectParticipantSchema,
} from '../project-participants/schemas/project-participant.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { ProjectCommitmentsService } from './project-commitments.service';
import {
  CommitmentStatus,
  ContributionCommitment,
  ContributionCommitmentSchema,
  ContributionType,
} from './schemas/contribution-commitment.schema';

describe('ProjectCommitmentsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let commitmentModel: Model<ContributionCommitment>;
  let service: ProjectCommitmentsService;
  let projectId: string;
  let participantId: string;
  const actorA = new Types.ObjectId().toHexString();
  const actorB = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    commitmentModel = connection.model(
      ContributionCommitment.name,
      ContributionCommitmentSchema,
    ) as Model<ContributionCommitment>;
    const projectModel = connection.model(Project.name, ProjectSchema) as Model<Project>;
    const participantModel = connection.model(
      ProjectParticipant.name,
      ProjectParticipantSchema,
    ) as Model<ProjectParticipant>;
    const counterModel = connection.model(Counter.name, CounterSchema) as Model<Counter>;

    await Promise.all([
      commitmentModel.syncIndexes(),
      projectModel.syncIndexes(),
      participantModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    service = new ProjectCommitmentsService(
      commitmentModel,
      projectModel,
      participantModel,
      new NumberingService(counterModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await commitmentModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Project.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(ProjectParticipant.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

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
  });

  async function createApproved(amount = 1_000_000) {
    const created = await service.create(
      projectId,
      {
        participantId,
        commitmentAmount: amount,
        contributionType: ContributionType.Capital,
        dueDate: '2026-12-31',
        paymentSchedule: [
          { dueDate: '2026-06-30', amount: amount / 2 },
          { dueDate: '2026-12-31', amount: amount / 2 },
        ],
        agreementReference: 'BR-COM-001',
      },
      actorA,
    );
    await service.submit(projectId, created.data!.id, actorA);
    return service.approve(projectId, created.data!.id, actorB);
  }

  it('creates, submits, and approves a commitment with tracking totals', async () => {
    const approved = await createApproved(2_000_000);
    expect(approved.data?.commitmentNumber).toMatch(/^COM-\d{4}-\d{6}$/);
    expect(approved.data?.status).toBe(CommitmentStatus.Approved);
    expect(approved.data?.pendingAmount).toBe(2_000_000);

    await service.recordReceipt(
      projectId,
      approved.data!.id,
      { amount: 500_000, reference: 'NEFT-1' },
      actorA,
    );

    const summary = await service.summary(projectId);
    expect(summary.data?.committedAmount).toBe(2_000_000);
    expect(summary.data?.receivedAmount).toBe(500_000);
    expect(summary.data?.pendingAmount).toBe(1_500_000);
  });

  it('blocks self-approval', async () => {
    const created = await service.create(
      projectId,
      {
        participantId,
        commitmentAmount: 100_000,
        contributionType: ContributionType.Loan,
      },
      actorA,
    );
    await service.submit(projectId, created.data!.id, actorA);
    await expect(
      service.approve(projectId, created.data!.id, actorA),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('versions amendments and does not overwrite prior approved amounts', async () => {
    const v1 = await createApproved(1_000_000);
    await service.recordReceipt(
      projectId,
      v1.data!.id,
      { amount: 400_000 },
      actorA,
    );

    await expect(
      service.amend(
        projectId,
        v1.data!.id,
        {
          commitmentAmount: 300_000,
          remarks: 'Illegal reduction below received',
        },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const amendment = await service.amend(
      projectId,
      v1.data!.id,
      {
        commitmentAmount: 1_500_000,
        remarks: 'Increased commitment after board approval',
        paymentSchedule: [
          { dueDate: '2026-06-30', amount: 750_000 },
          { dueDate: '2026-12-31', amount: 750_000 },
        ],
      },
      actorA,
    );

    expect(amendment.data?.version).toBe(2);
    expect(amendment.data?.commitmentNumber).toBe(v1.data?.commitmentNumber);
    expect(amendment.data?.receivedAmount).toBe(400_000);
    expect(amendment.data?.status).toBe(CommitmentStatus.Draft);

    await service.submit(projectId, amendment.data!.id, actorA);
    await service.approve(projectId, amendment.data!.id, actorB);

    const history = await service.listHistory(
      projectId,
      v1.data!.commitmentNumber,
    );
    expect(history.data).toHaveLength(2);
    expect(history.data?.[0]?.commitmentAmount).toBe(1_000_000);
    expect(history.data?.[0]?.status).toBe(CommitmentStatus.Superseded);
    expect(history.data?.[1]?.commitmentAmount).toBe(1_500_000);
    expect(history.data?.[1]?.status).toBe(CommitmentStatus.Approved);
    expect(history.data?.[1]?.receivedAmount).toBe(400_000);
  });

  it('cancels draft commitments and rejects cancel with receipts', async () => {
    const draft = await service.create(
      projectId,
      {
        participantId,
        commitmentAmount: 50_000,
        contributionType: ContributionType.Other,
      },
      actorA,
    );
    const cancelled = await service.cancel(
      projectId,
      draft.data!.id,
      { cancellationReason: 'No longer required for this phase' },
      actorA,
    );
    expect(cancelled.data?.status).toBe(CommitmentStatus.Cancelled);

    const approved = await createApproved(100_000);
    await service.recordReceipt(
      projectId,
      approved.data!.id,
      { amount: 10_000 },
      actorA,
    );
    await expect(
      service.cancel(
        projectId,
        approved.data!.id,
        { cancellationReason: 'Should fail because money received' },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects receipts that exceed commitment amount', async () => {
    const approved = await createApproved(100_000);
    await expect(
      service.recordReceipt(
        projectId,
        approved.data!.id,
        { amount: 150_000 },
        actorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
