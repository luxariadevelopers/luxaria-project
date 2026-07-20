import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { DatabaseService } from '../../database/services/database.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { ProjectAccessService } from '../project-access/project-access.service';
import type { PermissionsService } from '../rbac/permissions.service';
import { ApprovalsService } from './approvals.service';
import {
  ApprovalHistory,
  ApprovalHistorySchema,
} from './schemas/approval-history.schema';
import {
  ApprovalRequest,
  ApprovalRequestSchema,
  ApprovalStatus,
} from './schemas/approval-request.schema';
import {
  ApprovalWorkflow,
  ApprovalWorkflowSchema,
} from './schemas/approval-workflow.schema';

describe('ApprovalsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let workflowModel: Model<ApprovalWorkflow>;
  let requestModel: Model<ApprovalRequest>;
  let historyModel: Model<ApprovalHistory>;
  let service: ApprovalsService;
  let projectAccess: {
    assertCanAccessProject: jest.Mock;
  };
  let permissionsService: {
    resolveUserAccess: jest.Mock;
  };

  const projectId = new Types.ObjectId().toHexString();
  const requesterId = new Types.ObjectId().toHexString();
  const approverId = new Types.ObjectId().toHexString();
  const approver2Id = new Types.ObjectId().toHexString();
  const roleA = new Types.ObjectId().toHexString();
  const roleFallback = new Types.ObjectId().toHexString();
  const entityId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    workflowModel = connection.model(
      ApprovalWorkflow.name,
      ApprovalWorkflowSchema,
    ) as Model<ApprovalWorkflow>;
    requestModel = connection.model(
      ApprovalRequest.name,
      ApprovalRequestSchema,
    ) as Model<ApprovalRequest>;
    historyModel = connection.model(
      ApprovalHistory.name,
      ApprovalHistorySchema,
    ) as Model<ApprovalHistory>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      workflowModel.syncIndexes(),
      requestModel.syncIndexes(),
      historyModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    projectAccess = {
      assertCanAccessProject: jest.fn().mockResolvedValue({ allowed: true }),
    };
    permissionsService = {
      resolveUserAccess: jest.fn(),
    };

    const databaseService = {
      withTransaction: async <T>(work: (session: null) => Promise<T>) =>
        work(null),
    } as unknown as DatabaseService;

    service = new ApprovalsService(
      workflowModel,
      requestModel,
      historyModel,
      new NumberingService(counterModel),
      projectAccess as unknown as ProjectAccessService,
      permissionsService as unknown as PermissionsService,
      databaseService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await requestModel.deleteMany({}).setOptions({ withDeleted: true });
    await workflowModel.deleteMany({}).setOptions({ withDeleted: true });
    // Bypass mongoose immutability hooks for test isolation only
    await historyModel.collection.deleteMany({});
    await connection.model(Counter.name).deleteMany({});

    projectAccess.assertCanAccessProject.mockClear();
    projectAccess.assertCanAccessProject.mockResolvedValue({ allowed: true });

    permissionsService.resolveUserAccess.mockImplementation(
      async (userId: string) => ({
        userId,
        roleIds: userId === approverId || userId === approver2Id ? [roleA] : [],
        roleCodes: [],
        permissions: ['approval.act', 'approval.cancel'],
        bypassPermissions: false,
      }),
    );

    await service.upsertWorkflow(
      {
        module: 'expenses',
        entityType: 'expense_claim',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [roleA],
            specificUserIds: [],
            minimumAmount: 0,
            maximumAmount: 500_000,
            requiresAll: false,
            escalationHours: 1,
            fallbackRole: roleFallback,
          },
          {
            stepNumber: 2,
            specificUserIds: [approver2Id],
            roleIds: [],
            minimumAmount: 100_000,
            maximumAmount: null,
            requiresAll: false,
          },
        ],
      },
      requesterId,
    );
  });

  async function createAndSubmit(amount = 150_000) {
    const created = await service.create(
      projectId,
      {
        module: 'expenses',
        entityType: 'expense_claim',
        entityId,
        amount,
        reason: 'Site materials',
        submit: true,
      },
      requesterId,
    );
    return created.data!;
  }

  it('submits for approval with APR code and pending status', async () => {
    const row = await createAndSubmit();
    expect(row.approvalCode).toMatch(/^APR-\d{4}-\d{6}$/);
    expect(row.status).toBe(ApprovalStatus.Pending);
    expect(row.currentStep).toBe(1);
    expect(row.requestedBy).toBe(requesterId);
    expect(projectAccess.assertCanAccessProject).toHaveBeenCalled();
  });

  it('blocks requester from approving own request unless configured', async () => {
    const row = await createAndSubmit();
    await expect(
      service.approve(projectId, row.id, requesterId, { comment: 'self' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await service.upsertWorkflow(
      {
        module: 'expenses',
        entityType: 'expense_claim',
        allowSelfApprove: true,
        steps: [
          {
            stepNumber: 1,
            roleIds: [roleA],
            minimumAmount: 0,
            maximumAmount: null,
            requiresAll: false,
          },
        ],
      },
      requesterId,
    );

    permissionsService.resolveUserAccess.mockResolvedValueOnce({
      userId: requesterId,
      roleIds: [roleA],
      roleCodes: [],
      permissions: ['approval.act'],
      bypassPermissions: false,
    });

    const created = await service.create(
      projectId,
      {
        module: 'expenses',
        entityType: 'expense_claim',
        entityId: new Types.ObjectId().toHexString(),
        amount: 10_000,
        submit: true,
      },
      requesterId,
    );

    const approved = await service.approve(
      projectId,
      created.data!.id,
      requesterId,
    );
    expect(approved.data?.status).toBe(ApprovalStatus.Approved);
  });

  it('enforces approval amount limits on steps', async () => {
    await service.upsertWorkflow(
      {
        module: 'expenses',
        entityType: 'expense_claim',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [roleA],
            minimumAmount: 0,
            maximumAmount: 500_000,
            requiresAll: false,
          },
        ],
      },
      requesterId,
    );

    await expect(
      service.create(
        projectId,
        {
          module: 'expenses',
          entityType: 'expense_claim',
          entityId: new Types.ObjectId().toHexString(),
          amount: 900_000,
          submit: true,
        },
        requesterId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.upsertWorkflow(
      {
        module: 'expenses',
        entityType: 'expense_claim',
        allowSelfApprove: false,
        steps: [
          {
            stepNumber: 1,
            roleIds: [roleA],
            minimumAmount: 0,
            maximumAmount: 500_000,
            requiresAll: false,
          },
          {
            stepNumber: 2,
            specificUserIds: [approver2Id],
            minimumAmount: 100_000,
            maximumAmount: null,
            requiresAll: false,
          },
        ],
      },
      requesterId,
    );

    const low = await service.create(
      projectId,
      {
        module: 'expenses',
        entityType: 'expense_claim',
        entityId: new Types.ObjectId().toHexString(),
        amount: 50_000,
        submit: true,
      },
      requesterId,
    );
    expect(low.data?.currentStep).toBe(1);

    const afterStep1 = await service.approve(
      projectId,
      low.data!.id,
      approverId,
    );
    expect(afterStep1.data?.status).toBe(ApprovalStatus.Approved);
  });

  it('approves through multi-step workflow and keeps immutable history', async () => {
    const row = await createAndSubmit(150_000);
    const step1 = await service.approve(projectId, row.id, approverId, {
      comment: 'ok step 1',
    });
    expect(step1.data?.status).toBe(ApprovalStatus.Pending);
    expect(step1.data?.currentStep).toBe(2);

    const step2 = await service.approve(projectId, row.id, approver2Id, {
      comment: 'ok step 2',
    });
    expect(step2.data?.status).toBe(ApprovalStatus.Approved);

    const timeline = await service.getTimeline(projectId, row.id, approverId);
    expect(timeline.data?.timeline.map((t) => t.action)).toEqual([
      'submitted',
      'approved',
      'approved',
    ]);

    await expect(
      historyModel.updateOne(
        { _id: timeline.data!.timeline[0].id },
        { $set: { comment: 'tamper' } },
      ),
    ).rejects.toThrow(/immutable/i);
  });

  it('rejects, returns, cancels, and escalates', async () => {
    const rejectRow = await createAndSubmit();
    const rejected = await service.reject(projectId, rejectRow.id, approverId, {
      comment: 'no',
    });
    expect(rejected.data?.status).toBe(ApprovalStatus.Rejected);

    const returnEntity = new Types.ObjectId().toHexString();
    const returnCreated = await service.create(
      projectId,
      {
        module: 'expenses',
        entityType: 'expense_claim',
        entityId: returnEntity,
        amount: 120_000,
        submit: true,
      },
      requesterId,
    );
    const returned = await service.returnForCorrection(
      projectId,
      returnCreated.data!.id,
      approverId,
      { comment: 'fix docs' },
    );
    expect(returned.data?.status).toBe(ApprovalStatus.Returned);

    const resubmitted = await service.submit(
      projectId,
      returnCreated.data!.id,
      requesterId,
    );
    expect(resubmitted.data?.status).toBe(ApprovalStatus.Pending);

    const cancelEntity = new Types.ObjectId().toHexString();
    const cancelCreated = await service.create(
      projectId,
      {
        module: 'expenses',
        entityType: 'expense_claim',
        entityId: cancelEntity,
        amount: 120_000,
        submit: true,
      },
      requesterId,
    );
    const cancelled = await service.cancel(
      projectId,
      cancelCreated.data!.id,
      requesterId,
      { reason: 'withdrawn' },
    );
    expect(cancelled.data?.status).toBe(ApprovalStatus.Cancelled);

    const escalateEntity = new Types.ObjectId().toHexString();
    const escalateCreated = await service.create(
      projectId,
      {
        module: 'expenses',
        entityType: 'expense_claim',
        entityId: escalateEntity,
        amount: 120_000,
        submit: true,
      },
      requesterId,
    );
    await requestModel.updateOne(
      { _id: escalateCreated.data!.id },
      {
        $set: {
          stepEnteredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      },
    );
    const escalated = await service.escalate(
      projectId,
      escalateCreated.data!.id,
      approverId,
    );
    expect(escalated.data?.escalated).toBe(true);

    permissionsService.resolveUserAccess.mockResolvedValueOnce({
      userId: requesterId,
      roleIds: [roleFallback],
      roleCodes: [],
      permissions: ['approval.act'],
      bypassPermissions: false,
    });
    // requester still blocked by self-approve even after escalate
    await expect(
      service.approve(projectId, escalateCreated.data!.id, requesterId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const fallbackApprover = new Types.ObjectId().toHexString();
    permissionsService.resolveUserAccess.mockResolvedValueOnce({
      userId: fallbackApprover,
      roleIds: [roleFallback],
      roleCodes: [],
      permissions: ['approval.act'],
      bypassPermissions: false,
    });
    const afterEscalate = await service.approve(
      projectId,
      escalateCreated.data!.id,
      fallbackApprover,
    );
    expect(afterEscalate.data?.currentStep).toBe(2);
  });

  it('applies project access on act and view', async () => {
    const row = await createAndSubmit();
    projectAccess.assertCanAccessProject.mockRejectedValueOnce(
      new ForbiddenException('Project access denied'),
    );
    await expect(
      service.approve(projectId, row.id, approverId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectAccess.assertCanAccessProject).toHaveBeenCalledWith(
      requesterId,
      projectId,
      expect.any(String),
    );
  });
});
