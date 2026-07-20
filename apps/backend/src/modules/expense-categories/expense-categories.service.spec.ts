import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { ExpenseCategoriesService } from './expense-categories.service';
import { STANDARD_EXPENSE_CATEGORIES } from './expense-categories.seed';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
  ExpenseCategoryStatus,
} from './schemas/expense-category.schema';

describe('ExpenseCategoriesService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let categoryModel: Model<ExpenseCategory>;
  let accountModel: Model<Account>;
  let service: ExpenseCategoriesService;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    categoryModel = connection.model(
      ExpenseCategory.name,
      ExpenseCategorySchema,
    ) as Model<ExpenseCategory>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    await Promise.all([
      categoryModel.syncIndexes(),
      accountModel.syncIndexes(),
    ]);
    service = new ExpenseCategoriesService(categoryModel, accountModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await categoryModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
  });

  async function createExpenseLedger(code = '5100') {
    return accountModel.create({
      accountCode: code,
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
  }

  it('seeds standard expense categories idempotently', async () => {
    const first = await service.seedStandard(actorId);
    expect(first.data?.created).toBe(STANDARD_EXPENSE_CATEGORIES.length);
    expect(first.data?.skipped).toBe(0);

    const second = await service.seedStandard(actorId);
    expect(second.data?.created).toBe(0);
    expect(second.data?.skipped).toBe(STANDARD_EXPENSE_CATEGORIES.length);

    const labour = await service.getByCode('LABOUR');
    expect(labour.data?.name).toBe('Labour');
    expect(labour.data?.isSystem).toBe(true);
  });

  it('creates categories and builds a hierarchy tree', async () => {
    const parent = await service.create(
      { categoryCode: 'LABOUR', name: 'Labour' },
      actorId,
    );
    const child = await service.create(
      {
        categoryCode: 'LABOUR_SKILLED',
        name: 'Skilled Labour',
        parentCategoryId: parent.data!.id,
        requiresSignature: true,
      },
      actorId,
    );

    expect(child.data?.level).toBe(2);
    expect(child.data?.parentCategoryId).toBe(parent.data!.id);

    const tree = await service.getTree();
    const labourNode = tree.data?.find((n) => n.categoryCode === 'LABOUR');
    expect(labourNode?.children.some((c) => c.categoryCode === 'LABOUR_SKILLED')).toBe(
      true,
    );
  });

  it('rejects duplicate category codes', async () => {
    await service.create({ categoryCode: 'TOOLS', name: 'Tools' }, actorId);
    await expect(
      service.create({ categoryCode: 'tools', name: 'Tools Dup' }, actorId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('links defaultLedgerAccountId only to active expense accounts', async () => {
    const expense = await createExpenseLedger();
    const asset = await accountModel.create({
      accountCode: '1110',
      accountName: 'Bank',
      accountType: AccountType.Asset,
      accountCategory: AccountCategory.Bank,
      parentAccountId: null,
      level: 1,
      isControlAccount: false,
      allowManualPosting: true,
      requiresProject: false,
      requiresParty: false,
      status: AccountStatus.Active,
      postingCount: 0,
      isSystem: false,
    });

    const ok = await service.create(
      {
        categoryCode: 'MATERIAL',
        name: 'Material',
        defaultLedgerAccountId: String(expense._id),
        requiresBill: true,
      },
      actorId,
    );
    expect(ok.data?.defaultLedgerAccountId).toBe(String(expense._id));

    await expect(
      service.create(
        {
          categoryCode: 'BAD_LEDGER',
          name: 'Bad',
          defaultLedgerAccountId: String(asset._id),
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('configures evidence rules independently', async () => {
    const created = await service.create(
      { categoryCode: 'TRANSPORT', name: 'Transport' },
      actorId,
    );

    const updated = await service.configureEvidenceRules(
      created.data!.id,
      {
        requiresBill: true,
        requiresPhoto: true,
        requiresSignature: false,
        approvalLimit: 10_000,
      },
      actorId,
    );

    expect(updated.data?.requiresBill).toBe(true);
    expect(updated.data?.requiresPhoto).toBe(true);
    expect(updated.data?.requiresSignature).toBe(false);
    expect(updated.data?.approvalLimit).toBe(10_000);

    const cleared = await service.configureEvidenceRules(
      created.data!.id,
      { approvalLimit: null },
      actorId,
    );
    expect(cleared.data?.approvalLimit).toBeNull();
    expect(cleared.data?.requiresBill).toBe(true);
  });

  it('activates and deactivates with parent/child guards', async () => {
    const parent = await service.create(
      { categoryCode: 'SITE', name: 'Site Maintenance' },
      actorId,
    );
    const child = await service.create(
      {
        categoryCode: 'SITE_CLEAN',
        name: 'Cleaning',
        parentCategoryId: parent.data!.id,
      },
      actorId,
    );

    await expect(
      service.deactivate(parent.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);

    const childOff = await service.deactivate(child.data!.id, actorId);
    expect(childOff.data?.status).toBe(ExpenseCategoryStatus.Inactive);

    const parentOff = await service.deactivate(parent.data!.id, actorId);
    expect(parentOff.data?.status).toBe(ExpenseCategoryStatus.Inactive);

    await expect(
      service.activate(child.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.activate(parent.data!.id, actorId);
    const childOn = await service.activate(child.data!.id, actorId);
    expect(childOn.data?.status).toBe(ExpenseCategoryStatus.Active);
  });

  it('moves categories via setParent and blocks cycles', async () => {
    const a = await service.create(
      { categoryCode: 'A', name: 'A' },
      actorId,
    );
    const b = await service.create(
      {
        categoryCode: 'B',
        name: 'B',
        parentCategoryId: a.data!.id,
      },
      actorId,
    );
    const c = await service.create(
      {
        categoryCode: 'C',
        name: 'C',
        parentCategoryId: b.data!.id,
      },
      actorId,
    );

    await expect(
      service.setParent(
        a.data!.id,
        { parentCategoryId: c.data!.id },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const moved = await service.setParent(
      c.data!.id,
      { parentCategoryId: a.data!.id },
      actorId,
    );
    expect(moved.data?.parentCategoryId).toBe(a.data!.id);
    expect(moved.data?.level).toBe(2);
  });

  it('blocks delete of system categories and categories with children', async () => {
    await service.seedStandard(actorId);
    const labour = await service.getByCode('LABOUR');
    await expect(
      service.remove(labour.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);

    const parent = await service.create(
      { categoryCode: 'CUSTOM', name: 'Custom' },
      actorId,
    );
    await service.create(
      {
        categoryCode: 'CUSTOM_CHILD',
        name: 'Custom Child',
        parentCategoryId: parent.data!.id,
      },
      actorId,
    );
    await expect(
      service.remove(parent.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('soft-deletes leaf categories', async () => {
    const created = await service.create(
      { categoryCode: 'TEMP', name: 'Temporary' },
      actorId,
    );
    const removed = await service.remove(created.data!.id, actorId);
    expect(removed.data?.id).toBe(created.data!.id);
    await expect(service.getById(created.data!.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
