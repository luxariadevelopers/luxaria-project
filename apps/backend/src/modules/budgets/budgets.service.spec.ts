import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BudgetsService } from './budgets.service';
import { BudgetStatus } from './schemas/budget.schema';

describe('BudgetsService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const financialYearId = new Types.ObjectId().toHexString();
  const accountId = new Types.ObjectId().toHexString();

  function mockDoc(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      budgetNumber: 'BUD-2026-000001',
      companyId: new Types.ObjectId(companyId),
      projectId: null,
      financialYearId: new Types.ObjectId(financialYearId),
      name: 'FY26 Project Budget',
      version: 1,
      rootBudgetId: null,
      revisedFromId: null,
      status: BudgetStatus.Draft,
      lines: [
        {
          accountId: new Types.ObjectId(accountId),
          costCentreId: null,
          periodMonth: 4,
          amount: 100_000,
          notes: null,
        },
      ],
      totalAmount: 100_000,
      notes: null,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it('creates draft budget with computed total', async () => {
    const created = mockDoc();
    created.rootBudgetId = created._id;
    const model = {
      create: jest.fn().mockResolvedValue(created),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const fyModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: financialYearId }),
      }),
    };
    const service = new BudgetsService(model as never, fyModel as never);

    const res = await service.create(
      {
        companyId,
        financialYearId,
        name: 'FY26 Project Budget',
        lines: [{ accountId, amount: 100_000 }],
      },
      actorId,
    );

    expect(res.data?.totalAmount).toBe(100_000);
    expect(res.data?.status).toBe(BudgetStatus.Draft);
    expect(model.create).toHaveBeenCalled();
    expect(created.save).toHaveBeenCalled();
  });

  it('submits draft to pending_approval', async () => {
    const doc = mockDoc();
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new BudgetsService(model as never, {} as never);

    const res = await service.submit(String(doc._id), actorId);
    expect(res.data?.status).toBe(BudgetStatus.PendingApproval);
    expect(doc.save).toHaveBeenCalled();
  });

  it('rejects non-draft update', async () => {
    const doc = mockDoc({ status: BudgetStatus.Approved });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      }),
    };
    const service = new BudgetsService(model as never, {} as never);

    await expect(
      service.update(String(doc._id), { name: 'Updated' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revise supersedes approved budget and creates new version', async () => {
    const source = mockDoc({
      status: BudgetStatus.Approved,
      version: 2,
      rootBudgetId: new Types.ObjectId(),
    });
    const revised = mockDoc({ version: 3, status: BudgetStatus.Draft });
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(source),
      }),
      create: jest.fn().mockResolvedValue(revised),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(1),
        }),
      }),
    };
    const service = new BudgetsService(model as never, {} as never);

    const res = await service.revise(String(source._id), {}, actorId);
    expect(source.status).toBe(BudgetStatus.Superseded);
    expect(res.data?.version).toBe(3);
    expect(model.create).toHaveBeenCalled();
  });

  it('getApprovedBudgetAmount sums latest approved version lines', async () => {
    const rootId = new Types.ObjectId();
    const model = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: new Types.ObjectId(),
              rootBudgetId: rootId,
              version: 1,
              lines: [{ accountId: new Types.ObjectId(accountId), amount: 50_000 }],
            },
            {
              _id: new Types.ObjectId(),
              rootBudgetId: rootId,
              version: 2,
              lines: [{ accountId: new Types.ObjectId(accountId), amount: 80_000 }],
            },
          ]),
        }),
      }),
    };
    const service = new BudgetsService(model as never, {} as never);

    const amount = await service.getApprovedBudgetAmount(
      accountId,
      null,
      financialYearId,
    );
    expect(amount).toBe(80_000);
  });
});
