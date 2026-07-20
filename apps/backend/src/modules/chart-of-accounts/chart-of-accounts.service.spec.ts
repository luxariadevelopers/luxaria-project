import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { STANDARD_CONSTRUCTION_COA } from './chart-of-accounts.seed';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from './schemas/account.schema';

describe('ChartOfAccountsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let accountModel: Model<Account>;
  let service: ChartOfAccountsService;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    await accountModel.syncIndexes();
    service = new ChartOfAccountsService(accountModel);
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
  });

  it('seeds the standard construction chart of accounts', async () => {
    const first = await service.seedStandard(actorId);
    expect(first.data?.created).toBe(STANDARD_CONSTRUCTION_COA.length);
    expect(first.data?.skipped).toBe(0);

    const second = await service.seedStandard(actorId);
    expect(second.data?.created).toBe(0);
    expect(second.data?.skipped).toBe(STANDARD_CONSTRUCTION_COA.length);

    const tree = await service.getTree();
    expect(tree.data?.length).toBe(5);
    const assets = tree.data?.find((n) => n.accountCode === '1000');
    expect(assets?.isControlAccount).toBe(true);
    expect(assets?.allowManualPosting).toBe(false);
    expect(assets?.children.some((c) => c.accountCode === '1100')).toBe(true);
  });

  it('creates accounts under a parent and builds hierarchy levels', async () => {
    await service.seedStandard(actorId);
    const bankParent = await service.getByCode('1110');

    const child = await service.create(
      {
        accountCode: '1111',
        accountName: 'HDFC Current',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        parentAccountId: bankParent.data!.id,
      },
      actorId,
    );

    expect(child.data?.level).toBe(bankParent.data!.level + 1);
    expect(child.data?.parentAccountId).toBe(bankParent.data!.id);

    await expect(
      service.create(
        {
          accountCode: '1112',
          accountName: 'Wrong type child',
          accountType: AccountType.Liability,
          accountCategory: AccountCategory.Loan,
          parentAccountId: bankParent.data!.id,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks delete when postings exist and allows when clear', async () => {
    const created = await service.create(
      {
        accountCode: '9001',
        accountName: 'Temp Expense',
        accountType: AccountType.Expense,
        accountCategory: AccountCategory.IndirectExpense,
      },
      actorId,
    );

    await service.incrementPostingCount(created.data!.id, 1);
    await expect(
      service.remove(created.data!.id, actorId),
    ).rejects.toBeInstanceOf(ConflictException);

    await accountModel.updateOne(
      { _id: created.data!.id },
      { $set: { postingCount: 0 } },
    );
    const removed = await service.remove(created.data!.id, actorId);
    expect(removed.data?.id).toBe(created.data!.id);

    await expect(service.getById(created.data!.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects manual posting on control accounts unless configured', async () => {
    await service.seedStandard(actorId);
    const control = await service.getByCode('1000');

    await expect(
      service.assertAllowsManualPosting(control.data!.id),
    ).rejects.toBeInstanceOf(BadRequestException);

    const configured = await service.create(
      {
        accountCode: '1190',
        accountName: 'Control With Manual',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Control,
        isControlAccount: true,
        allowManualPosting: true,
      },
      actorId,
    );

    const ok = await service.assertAllowsManualPosting(configured.data!.id);
    expect(ok.accountCode).toBe('1190');
  });

  it('activates and deactivates accounts', async () => {
    const created = await service.create(
      {
        accountCode: '9002',
        accountName: 'Toggle',
        accountType: AccountType.Income,
        accountCategory: AccountCategory.OtherIncome,
      },
      actorId,
    );

    const off = await service.deactivate(created.data!.id, actorId);
    expect(off.data?.status).toBe(AccountStatus.Inactive);

    const on = await service.activate(created.data!.id, actorId);
    expect(on.data?.status).toBe(AccountStatus.Active);
  });

  it('moves accounts in the hierarchy via setParent', async () => {
    await service.seedStandard(actorId);
    const wip = await service.getByCode('1150');
    const nonCurrent = await service.getByCode('1200');

    const moved = await service.setParent(
      wip.data!.id,
      { parentAccountId: nonCurrent.data!.id },
      actorId,
    );
    expect(moved.data?.parentAccountId).toBe(nonCurrent.data!.id);
    expect(moved.data?.level).toBe(nonCurrent.data!.level + 1);
  });
});
