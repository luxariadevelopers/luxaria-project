import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  AccountCategory,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { FinancialYearStatus } from '../financial-year/schemas/financial-year.schema';
import { OpeningBalancesService } from './opening-balances.service';
import { OpeningBalancePackStatus } from './schemas/opening-balance-pack.schema';

describe('OpeningBalancesService', () => {
  const actorId = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId().toHexString();
  const financialYearId = new Types.ObjectId().toHexString();
  const debitAccountId = new Types.ObjectId().toHexString();
  const creditAccountId = new Types.ObjectId().toHexString();

  function mockPack(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      packNumber: 'OB-2026-0001',
      companyId: new Types.ObjectId(companyId),
      financialYearId: new Types.ObjectId(financialYearId),
      projectId: null,
      status: OpeningBalancePackStatus.Draft,
      lines: [
        {
          accountId: new Types.ObjectId(debitAccountId),
          debit: 10_000,
          credit: 0,
          costCentreId: null,
          partyType: null,
          partyId: null,
          description: 'Debit',
        },
        {
          accountId: new Types.ObjectId(creditAccountId),
          debit: 0,
          credit: 10_000,
          costCentreId: null,
          partyType: null,
          partyId: null,
          description: 'Credit',
        },
      ],
      totalDebit: 10_000,
      totalCredit: 10_000,
      journalEntryId: null,
      notes: null,
      postedBy: null,
      postedAt: null,
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      markModified: jest.fn(),
      ...overrides,
    };
  }

  function buildService(deps: {
    model?: Record<string, unknown>;
    accountModel?: Record<string, unknown>;
    financialYearModel?: Record<string, unknown>;
    journalService?: Record<string, unknown>;
    financialYearService?: Record<string, unknown>;
    costCentresService?: Record<string, unknown>;
  } = {}) {
    const defaultModel = {
      create: jest.fn().mockImplementation(async (payload) => ({
        _id: new Types.ObjectId(),
        ...payload,
      })),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
      findById: jest.fn(),
    };

    const defaultAccountModel = {
      findById: jest.fn().mockImplementation((id: string) => ({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          accountCode: '1000',
          status: AccountStatus.Active,
          accountType: AccountType.Asset,
          accountCategory: AccountCategory.Bank,
          requiresProject: false,
        }),
      })),
    };

    const defaultFinancialYearModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(financialYearId),
          companyId: new Types.ObjectId(companyId),
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          status: FinancialYearStatus.Open,
        }),
      }),
    };

    const defaultJournalService = {
      create: jest.fn().mockResolvedValue({
        data: { id: new Types.ObjectId().toHexString() },
      }),
    };

    const defaultFinancialYearService = {
      assertPostingAllowed: jest.fn().mockResolvedValue({ id: financialYearId }),
    };

    const defaultCostCentresService = {
      assertActive: jest.fn(),
    };

    return new OpeningBalancesService(
      (deps.model ?? defaultModel) as never,
      (deps.accountModel ?? defaultAccountModel) as never,
      (deps.financialYearModel ?? defaultFinancialYearModel) as never,
      {
        findById: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue({ _id: companyId }),
            }),
          }),
        }),
      } as never,
      { findById: jest.fn() } as never,
      (deps.journalService ?? defaultJournalService) as never,
      (deps.financialYearService ?? defaultFinancialYearService) as never,
      (deps.costCentresService ?? defaultCostCentresService) as never,
    );
  }

  it('rejects unbalanced opening lines on create', async () => {
    const service = buildService();

    await expect(
      service.create(
        {
          companyId,
          financialYearId,
          lines: [
            { accountId: debitAccountId, debit: 1000, credit: 0 },
            { accountId: creditAccountId, debit: 0, credit: 500 },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates balanced draft pack', async () => {
    const model = {
      create: jest.fn().mockImplementation(async (payload) => ({
        _id: new Types.ObjectId(),
        ...payload,
      })),
      countDocuments: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        }),
      }),
    };
    const service = buildService({ model });

    const res = await service.create(
      {
        companyId,
        financialYearId,
        lines: [
          { accountId: debitAccountId, debit: 10_000, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: 10_000 },
        ],
      },
      actorId,
    );

    expect(res.data?.status).toBe(OpeningBalancePackStatus.Draft);
    expect(res.data?.totalDebit).toBe(10_000);
    expect(res.data?.totalCredit).toBe(10_000);
    expect(model.create).toHaveBeenCalled();
  });

  it('posts draft pack and links journal entry', async () => {
    const pack = mockPack();
    const journalId = new Types.ObjectId().toHexString();
    const journalService = {
      create: jest.fn().mockResolvedValue({ data: { id: journalId } }),
    };
    const model = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(pack),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
    };
    const accountModel = {
      findById: jest.fn().mockImplementation((id: string) => ({
        exec: jest.fn().mockResolvedValue({
          _id: id,
          accountCode: '1000',
          status: AccountStatus.Active,
          requiresProject: false,
        }),
      })),
    };

    const service = buildService({ model, journalService, accountModel });
    const res = await service.post(String(pack._id), actorId);

    expect(res.data?.status).toBe(OpeningBalancePackStatus.Posted);
    expect(res.data?.journalEntryId).toBe(journalId);
    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'opening_balance',
        postingPurpose: 'opening',
        post: true,
      }),
      actorId,
      expect.stringContaining('opening-balance-post:'),
    );
    expect(pack.save).toHaveBeenCalled();
  });
});
