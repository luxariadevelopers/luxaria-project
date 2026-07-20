import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import type { ApprovalsService } from '../approvals/approvals.service';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import type { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { PettyCashRequirementsService } from './petty-cash-requirements.service';
import {
  PettyCashExpenseDraft,
  PettyCashExpenseDraftSchema,
  PettyCashExpenseDraftStatus,
} from './schemas/petty-cash-expense-draft.schema';
import {
  PettyCashExpenseCategory,
  PettyCashRequirement,
  PettyCashRequirementSchema,
  PettyCashRequirementStatus,
} from './schemas/petty-cash-requirement.schema';

describe('PettyCashRequirementsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let requirementModel: Model<PettyCashRequirement>;
  let expenseDraftModel: Model<PettyCashExpenseDraft>;
  let service: PettyCashRequirementsService;
  let cashAccountsService: {
    getById: jest.Mock;
    getBalance: jest.Mock;
  };
  let approvalsService: {
    create: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    returnForCorrection: jest.Mock;
  };

  const projectId = new Types.ObjectId().toHexString();
  const pettyCashAccountId = new Types.ObjectId().toHexString();
  const requesterId = new Types.ObjectId().toHexString();
  const pmId = new Types.ObjectId().toHexString();
  const financeId = new Types.ObjectId().toHexString();
  const approvalId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    requirementModel = connection.model(
      PettyCashRequirement.name,
      PettyCashRequirementSchema,
    ) as Model<PettyCashRequirement>;
    expenseDraftModel = connection.model(
      PettyCashExpenseDraft.name,
      PettyCashExpenseDraftSchema,
    ) as Model<PettyCashExpenseDraft>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      requirementModel.syncIndexes(),
      expenseDraftModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    cashAccountsService = {
      getById: jest.fn(),
      getBalance: jest.fn(),
    };
    approvalsService = {
      create: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      returnForCorrection: jest.fn(),
    };

    service = new PettyCashRequirementsService(
      requirementModel,
      expenseDraftModel,
      cashAccountsService as unknown as CashAccountsService,
      approvalsService as unknown as ApprovalsService,
      new NumberingService(counterModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await requirementModel.deleteMany({}).setOptions({ withDeleted: true });
    await expenseDraftModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    cashAccountsService.getById.mockResolvedValue({
      data: {
        id: pettyCashAccountId,
        kind: CashAccountKind.PettyCash,
        projectId,
        status: CashAccountStatus.Active,
      },
    });
    cashAccountsService.getBalance.mockResolvedValue({
      data: { currentBalance: 8_000 },
    });
    approvalsService.create.mockResolvedValue({
      data: { id: approvalId, status: ApprovalStatus.Pending },
    });
    approvalsService.approve.mockReset();
    approvalsService.reject.mockReset();
    approvalsService.returnForCorrection.mockReset();
  });

  const items = [
    {
      expenseCategory: PettyCashExpenseCategory.Transport,
      description: 'Site jeep hire',
      estimatedAmount: 5_000,
    },
    {
      expenseCategory: PettyCashExpenseCategory.Food,
      description: 'Labour meals',
      estimatedAmount: 3_000,
    },
  ];

  async function createDraft() {
    return service.create(
      {
        projectId,
        pettyCashAccountId,
        weekStartDate: '2026-07-13',
        weekEndDate: '2026-07-19',
        requirementItems: items,
        justification: 'Weekly float for Tower A',
      },
      requesterId,
    );
  }

  it('creates a draft with PCR number, balance snapshot, and item total', async () => {
    const created = await createDraft();
    expect(created.data?.requestNumber).toMatch(/^PCR-\d{4}-\d{6}$/);
    expect(created.data?.status).toBe(PettyCashRequirementStatus.Draft);
    expect(created.data?.requestedAmount).toBe(8_000);
    expect(created.data?.currentCashBalance).toBe(8_000);
    expect(created.data?.previousUnsettledAmount).toBe(0);
  });

  it('shows previous unsettled amount and warns on unsubmitted expenses', async () => {
    await requirementModel.create({
      requestNumber: 'PCR-2026-000099',
      projectId: new Types.ObjectId(projectId),
      pettyCashAccountId: new Types.ObjectId(pettyCashAccountId),
      requestedBy: new Types.ObjectId(requesterId),
      weekStartDate: new Date('2026-07-06T00:00:00.000Z'),
      weekEndDate: new Date('2026-07-12T23:59:59.999Z'),
      currentCashBalance: 0,
      previousUnsettledAmount: 0,
      warnings: [],
      requestedAmount: 10_000,
      approvedAmount: 10_000,
      fundedAmount: 10_000,
      requirementItems: items,
      justification: 'Prior week',
      status: PettyCashRequirementStatus.Funded,
    });

    await expenseDraftModel.create({
      pettyCashAccountId: new Types.ObjectId(pettyCashAccountId),
      projectId: new Types.ObjectId(projectId),
      expenseDate: new Date('2026-07-10T00:00:00.000Z'),
      amount: 500,
      description: 'Old tea expense',
      status: PettyCashExpenseDraftStatus.Draft,
    });

    const created = await createDraft();
    expect(created.data?.previousUnsettledAmount).toBe(10_000);
    expect(created.data?.warnings.some((w) => /unsettled/i.test(w))).toBe(true);
    expect(created.data?.warnings.some((w) => /not submitted/i.test(w))).toBe(
      true,
    );
  });

  it('prevents duplicate requests for the same account and week', async () => {
    await createDraft();
    await expect(createDraft()).rejects.toBeInstanceOf(ConflictException);
  });

  it('runs submit → PM → finance (approved amount may differ) → fund → close', async () => {
    const created = await createDraft();

    const submitted = await service.submit(created.data!.id, requesterId);
    expect(submitted.data?.status).toBe(PettyCashRequirementStatus.Submitted);
    expect(approvalsService.create).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({
        module: 'petty_cash',
        entityType: 'weekly_requirement',
        entityId: created.data!.id,
        amount: 8_000,
        submit: true,
      }),
      requesterId,
    );

    await expect(
      service.projectManagerApprove(created.data!.id, requesterId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    approvalsService.approve.mockResolvedValueOnce({
      data: { id: approvalId, status: ApprovalStatus.Pending, currentStep: 2 },
    });
    const pm = await service.projectManagerApprove(
      created.data!.id,
      pmId,
      { comment: 'OK' },
    );
    expect(pm.data?.status).toBe(PettyCashRequirementStatus.FinanceReview);

    approvalsService.approve.mockResolvedValueOnce({
      data: { id: approvalId, status: ApprovalStatus.Approved },
    });
    const finance = await service.financeApprove(created.data!.id, financeId, {
      approvedAmount: 7_500,
      comment: 'Reduced float',
    });
    expect(finance.data?.status).toBe(PettyCashRequirementStatus.Approved);
    expect(finance.data?.approvedAmount).toBe(7_500);
    expect(finance.data?.requestedAmount).toBe(8_000);

    const funded = await service.fund(created.data!.id, financeId);
    expect(funded.data?.status).toBe(PettyCashRequirementStatus.Funded);
    expect(funded.data?.fundedAmount).toBe(7_500);

    const closed = await service.close(created.data!.id, financeId);
    expect(closed.data?.status).toBe(PettyCashRequirementStatus.Closed);
  });

  it('rejects funding above approved amount on a fresh approved row', async () => {
    const created = await createDraft();
    await service.submit(created.data!.id, requesterId);
    approvalsService.approve.mockResolvedValueOnce({
      data: { status: ApprovalStatus.Pending },
    });
    await service.projectManagerApprove(created.data!.id, pmId);
    approvalsService.approve.mockResolvedValueOnce({
      data: { status: ApprovalStatus.Approved },
    });
    await service.financeApprove(created.data!.id, financeId, {
      approvedAmount: 6_000,
    });

    await expect(
      service.fund(created.data!.id, financeId, { fundedAmount: 6_500 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const funded = await service.fund(created.data!.id, financeId, {
      fundedAmount: 6_000,
    });
    expect(funded.data?.fundedAmount).toBe(6_000);
  });
});
