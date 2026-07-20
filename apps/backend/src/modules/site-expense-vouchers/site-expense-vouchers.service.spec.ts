import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import type { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import type { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { ExpenseCategoryStatus } from '../expense-categories/schemas/expense-category.schema';
import type { FinancialYearService } from '../financial-year/financial-year.service';
import type { JournalService } from '../journal/journal.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Project,
  ProjectSchema,
  ProjectStatus,
  ProjectType,
} from '../projects/schemas/project.schema';
import { SiteExpenseVouchersService } from './site-expense-vouchers.service';
import {
  SiteExpenseAttachmentType,
  SiteExpensePaymentMode,
  SiteExpenseVoucher,
  SiteExpenseVoucherSchema,
  SiteExpenseVoucherStatus,
} from './schemas/site-expense-voucher.schema';

describe('SiteExpenseVouchersService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let voucherModel: Model<SiteExpenseVoucher>;
  let projectModel: Model<Project>;
  let accountModel: Model<Account>;
  let service: SiteExpenseVouchersService;

  let cashAccountsService: {
    getById: jest.Mock;
    assertSufficientBalance: jest.Mock;
  };
  let expenseCategoriesService: { getById: jest.Mock };
  let journalService: { create: jest.Mock };
  let financialYearService: { assertPostingAllowed: jest.Mock };

  const actorId = new Types.ObjectId().toHexString();
  const verifierId = new Types.ObjectId().toHexString();
  const approverId = new Types.ObjectId().toHexString();
  const posterId = new Types.ObjectId().toHexString();
  const pettyCashAccountId = new Types.ObjectId().toHexString();
  const pettyLedgerId = new Types.ObjectId().toHexString();
  const categoryId = new Types.ObjectId().toHexString();
  let projectId: string;
  let expenseLedgerId: string;
  let wipLedgerId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    voucherModel = connection.model(
      SiteExpenseVoucher.name,
      SiteExpenseVoucherSchema,
    ) as Model<SiteExpenseVoucher>;
    projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;

    await Promise.all([
      voucherModel.syncIndexes(),
      projectModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    cashAccountsService = {
      getById: jest.fn(),
      assertSufficientBalance: jest.fn(),
    };
    expenseCategoriesService = { getById: jest.fn() };
    journalService = { create: jest.fn() };
    financialYearService = { assertPostingAllowed: jest.fn() };

    service = new SiteExpenseVouchersService(
      voucherModel,
      projectModel,
      accountModel,
      cashAccountsService as unknown as CashAccountsService,
      expenseCategoriesService as unknown as ExpenseCategoriesService,
      journalService as unknown as JournalService,
      new NumberingService(counterModel),
      financialYearService as unknown as FinancialYearService,
      new IdempotencyService(idempotencyModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await voucherModel.deleteMany({}).setOptions({ withDeleted: true });
    await projectModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).deleteMany({});

    const project = await projectModel.create({
      projectCode: 'PRJ-2026-0001',
      projectName: 'Test Site',
      projectType: ProjectType.Residential,
      address: {
        line1: 'Site Road',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      latitude: 13.0827,
      longitude: 80.2707,
      siteRadiusMeters: 200,
      status: ProjectStatus.Construction,
      companyId: new Types.ObjectId(),
    });
    projectId = String(project._id);

    const expense = await accountModel.create({
      accountCode: '5100',
      accountName: 'Site Expenses',
      accountType: AccountType.Expense,
      accountCategory: AccountCategory.DirectExpense,
      parentAccountId: null,
      level: 1,
      isControlAccount: false,
      allowManualPosting: true,
      requiresProject: true,
      requiresParty: false,
      status: AccountStatus.Active,
      postingCount: 0,
      isSystem: false,
    });
    expenseLedgerId = String(expense._id);

    const wip = await accountModel.create({
      accountCode: '1150',
      accountName: 'Work in Progress',
      accountType: AccountType.Asset,
      accountCategory: AccountCategory.WorkInProgress,
      parentAccountId: null,
      level: 1,
      isControlAccount: false,
      allowManualPosting: true,
      requiresProject: true,
      requiresParty: false,
      status: AccountStatus.Active,
      postingCount: 0,
      isSystem: true,
    });
    wipLedgerId = String(wip._id);

    cashAccountsService.getById.mockResolvedValue({
      data: {
        id: pettyCashAccountId,
        kind: CashAccountKind.PettyCash,
        projectId,
        status: CashAccountStatus.Active,
        ledgerAccountId: pettyLedgerId,
      },
    });
    cashAccountsService.assertSufficientBalance.mockResolvedValue({
      data: { currentBalance: 50_000 },
    });

    expenseCategoriesService.getById.mockResolvedValue({
      data: {
        id: categoryId,
        categoryCode: 'TRANSPORT',
        status: ExpenseCategoryStatus.Active,
        requiresBill: true,
        requiresPhoto: true,
        requiresSignature: false,
        defaultLedgerAccountId: expenseLedgerId,
        approvalLimit: null,
      },
    });

    journalService.create.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString(), status: 'posted' },
    });
    financialYearService.assertPostingAllowed.mockResolvedValue({});
  });

  function baseDto(overrides: Record<string, unknown> = {}) {
    return {
      projectId,
      pettyCashAccountId,
      expenseDate: '2026-07-17',
      expenseCategoryId: categoryId,
      amount: 1_500,
      paidTo: 'Ravi Kumar',
      purpose: 'Transport of materials',
      paymentMode: SiteExpensePaymentMode.Cash,
      billNumber: 'BILL-100',
      billDate: '2026-07-16',
      latitude: 13.0827,
      longitude: 80.2707,
      attachments: [
        {
          type: SiteExpenseAttachmentType.Bill,
          filePath: 'uploads/bills/bill-100.pdf',
        },
        {
          type: SiteExpenseAttachmentType.Photo,
          filePath: 'uploads/photos/photo-100.jpg',
        },
      ],
      ...overrides,
    };
  }

  async function createDraft(overrides: Record<string, unknown> = {}) {
    return service.create(baseDto(overrides), actorId);
  }

  async function advanceToApproved(id: string) {
    await service.submit(id, actorId);
    await service.verify(id, verifierId);
    await service.approve(id, approverId);
  }

  it('creates a draft voucher with EXP number', async () => {
    const res = await createDraft();
    expect(res.data?.status).toBe(SiteExpenseVoucherStatus.Draft);
    expect(res.data?.voucherNumber).toMatch(/^EXP-\d{4}-\d{6}$/);
    expect(res.data?.submittedBy).toBeNull();
  });

  it('warns for backdated expense dates', async () => {
    const res = await createDraft({ expenseDate: '2020-01-01' });
    expect(res.data?.warnings).toEqual(
      expect.arrayContaining(['Expense date is backdated']),
    );
  });

  it('warns when GPS is outside project radius', async () => {
    const res = await createDraft({
      latitude: 13.2,
      longitude: 80.4,
    });
    expect(
      res.data?.warnings.some((w) => w.includes('outside project radius')),
    ).toBe(true);
  });

  it('warns on possible duplicate bills', async () => {
    await createDraft({ billNumber: 'DUP-1', amount: 2_000 });
    const second = await createDraft({ billNumber: 'DUP-1', amount: 2_000 });
    expect(
      second.data?.warnings.some((w) => w.includes('Possible duplicate bill')),
    ).toBe(true);
  });

  it('enforces category evidence rules on submit', async () => {
    const created = await createDraft({
      attachments: [
        {
          type: SiteExpenseAttachmentType.Bill,
          filePath: 'uploads/bills/only-bill.pdf',
        },
      ],
    });
    await expect(
      service.submit(created.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks submitter from verifying', async () => {
    const created = await createDraft();
    await service.submit(created.data!.id, actorId);
    await expect(
      service.verify(created.data!.id, actorId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('posts with Dr expense / Cr petty cash via journal service', async () => {
    const created = await createDraft();
    const id = created.data!.id;
    await advanceToApproved(id);

    const posted = await service.post(id, posterId);
    expect(posted.data?.status).toBe(SiteExpenseVoucherStatus.Posted);
    expect(posted.data?.journalEntryId).toBeTruthy();

    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'site_expense',
        sourceEntityType: 'expense_voucher',
        post: true,
        lines: [
          expect.objectContaining({
            accountId: expenseLedgerId,
            debit: 1_500,
            credit: 0,
          }),
          expect.objectContaining({
            accountId: pettyLedgerId,
            debit: 0,
            credit: 1_500,
          }),
        ],
      }),
      posterId,
      `sev-journal:${id}`,
    );
    expect(cashAccountsService.assertSufficientBalance).toHaveBeenCalledWith(
      pettyCashAccountId,
      1_500,
    );
  });

  it('debits WIP when boqItemId is set', async () => {
    const boqItemId = new Types.ObjectId().toHexString();
    const created = await createDraft({ boqItemId });
    const id = created.data!.id;
    await advanceToApproved(id);

    await service.post(id, posterId);
    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            accountId: wipLedgerId,
            debit: 1_500,
            boqItemId,
          }),
          expect.objectContaining({
            accountId: pettyLedgerId,
            credit: 1_500,
          }),
        ],
      }),
      posterId,
      expect.any(String),
    );
  });

  it('rejects updates to posted vouchers', async () => {
    const created = await createDraft();
    const id = created.data!.id;
    await advanceToApproved(id);
    await service.post(id, posterId);

    await expect(
      service.update(id, { purpose: 'Changed' }, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.cancel(
        id,
        { cancellationReason: 'Oops' },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replays post with default idempotency key', async () => {
    const created = await createDraft();
    const id = created.data!.id;
    await advanceToApproved(id);

    const first = await service.post(id, posterId);
    const second = await service.post(id, posterId);
    expect(second.data?.id).toBe(first.data?.id);
    expect(journalService.create).toHaveBeenCalledTimes(1);
  });

  it('requires signature when category configures it', async () => {
    expenseCategoriesService.getById.mockResolvedValue({
      data: {
        id: categoryId,
        categoryCode: 'LABOUR',
        status: ExpenseCategoryStatus.Active,
        requiresBill: false,
        requiresPhoto: false,
        requiresSignature: true,
        defaultLedgerAccountId: expenseLedgerId,
        approvalLimit: null,
      },
    });

    const created = await createDraft({
      attachments: [],
      billNumber: null,
    });
    await expect(
      service.submit(created.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.update(
      created.data!.id,
      {
        attachments: [
          {
            type: SiteExpenseAttachmentType.Signature,
            filePath: 'uploads/sig.png',
          },
        ],
      },
      actorId,
    );
    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data?.status).toBe(SiteExpenseVoucherStatus.Submitted);
  });
});
