import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import {
  JournalEntry,
  JournalEntrySchema,
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
import { User, UserSchema, UserStatus } from '../users/schemas/user.schema';
import { CashAccountsService } from './cash-accounts.service';
import {
  CashAccount,
  CashAccountKind,
  CashAccountSchema,
  CashAccountStatus,
} from './schemas/cash-account.schema';

describe('CashAccountsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let cashModel: Model<CashAccount>;
  let journalModel: Model<JournalEntry>;
  let service: CashAccountsService;

  let projectId: string;
  let pettyLedgerId: string;
  let bankLedgerId: string;
  let custodianA: string;
  let custodianB: string;
  let managerId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    cashModel = connection.model(
      CashAccount.name,
      CashAccountSchema,
    ) as Model<CashAccount>;
    const accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const userModel = connection.model(User.name, UserSchema) as Model<User>;
    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      cashModel.syncIndexes(),
      accountModel.syncIndexes(),
      projectModel.syncIndexes(),
      userModel.syncIndexes(),
      journalModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    service = new CashAccountsService(
      cashModel,
      accountModel,
      projectModel,
      userModel,
      journalModel,
      new NumberingService(counterModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await cashModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Account.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Project.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(User.name).deleteMany({}).setOptions({ withDeleted: true });
    await journalModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [project] = await connection.model(Project.name).create([
      {
        projectCode: 'PRJ-2026-0001',
        projectName: 'Skyline',
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

    const [petty, bank] = await connection.model(Account.name).create([
      {
        accountCode: '1130',
        accountName: 'Petty Cash',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.PettyCash,
        level: 1,
        status: AccountStatus.Active,
        isControlAccount: false,
        allowManualPosting: true,
        postingCount: 0,
      },
      {
        accountCode: '1110',
        accountName: 'Bank',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        level: 1,
        status: AccountStatus.Active,
        isControlAccount: false,
        allowManualPosting: true,
        postingCount: 0,
      },
    ]);
    pettyLedgerId = String(petty._id);
    bankLedgerId = String(bank._id);

    const users = await connection.model(User.name).create([
      {
        userCode: 'USR-000001',
        fullName: 'Custodian A',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
      {
        userCode: 'USR-000002',
        fullName: 'Custodian B',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
      {
        userCode: 'USR-000003',
        fullName: 'Manager',
        passwordHash: 'hash',
        status: UserStatus.Active,
      },
    ]);
    custodianA = String(users[0]._id);
    custodianB = String(users[1]._id);
    managerId = String(users[2]._id);
  });

  async function createPetty(openingBalance = 0) {
    return service.create(
      {
        accountName: 'Tower A Petty Cash',
        kind: CashAccountKind.PettyCash,
        projectId,
        custodianUserId: custodianA,
        ledgerAccountId: pettyLedgerId,
        maximumHoldingLimit: 50_000,
        replenishmentLevel: 10_000,
        openingBalance,
      },
      managerId,
    );
  }

  it('creates a site petty-cash account with custodian and CSH code', async () => {
    const created = await createPetty(5_000);
    expect(created.data?.accountCode).toMatch(/^CSH-\d{4}$/);
    expect(created.data?.custodianUserId).toBe(custodianA);
    expect(created.data?.status).toBe(CashAccountStatus.Active);
    expect(created.data?.kind).toBe(CashAccountKind.PettyCash);
  });

  it('requires a Cash/PettyCash ledger and rejects bank ledgers', async () => {
    await expect(
      service.create(
        {
          accountName: 'Bad',
          kind: CashAccountKind.PettyCash,
          projectId,
          custodianUserId: custodianA,
          ledgerAccountId: bankLedgerId,
          maximumHoldingLimit: 10_000,
          replenishmentLevel: 2_000,
        },
        managerId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks direct custodian change without handover confirmation', async () => {
    const created = await createPetty();
    await expect(
      service.assignCustodian(
        created.data!.id,
        { custodianUserId: custodianB },
        managerId,
      ),
    ).rejects.toThrow(/handover confirmation/i);
  });

  it('transfers custodian only after both parties confirm handover', async () => {
    const created = await createPetty(1_000);
    const initiated = await service.initiateCustodianTransfer(
      created.data!.id,
      { toUserId: custodianB, declaredBalance: 1_000 },
      managerId,
    );
    expect(initiated.data?.status).toBe(CashAccountStatus.PendingHandover);
    expect(initiated.data?.pendingHandover?.awaitingOutgoingConfirmation).toBe(
      true,
    );

    await expect(
      service.confirmHandover(created.data!.id, managerId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const out = await service.confirmHandover(created.data!.id, custodianA);
    expect(out.data?.pendingHandover?.awaitingOutgoingConfirmation).toBe(false);
    expect(out.data?.pendingHandover?.awaitingIncomingConfirmation).toBe(true);
    expect(out.data?.custodianUserId).toBe(custodianA);

    const done = await service.confirmHandover(created.data!.id, custodianB);
    expect(done.data?.status).toBe(CashAccountStatus.Active);
    expect(done.data?.custodianUserId).toBe(custodianB);
    expect(done.data?.pendingHandover).toBeNull();
  });

  it('computes balance, flags negative, and blocks insufficient disbursement', async () => {
    const created = await createPetty(2_000);

    await journalModel.create({
      journalNumber: 'JV-2026-000010',
      journalDate: new Date('2026-07-01'),
      financialYearId: new Types.ObjectId(),
      narration: 'Petty spend',
      status: JournalStatus.Posted,
      totalDebit: 500,
      totalCredit: 500,
      lines: [
        {
          accountId: new Types.ObjectId(pettyLedgerId),
          debit: 0,
          credit: 500,
          description: 'Tea & transport',
        },
        {
          accountId: new Types.ObjectId(bankLedgerId),
          debit: 500,
          credit: 0,
          description: 'contra',
        },
      ],
    });

    const balance = await service.getBalance(created.data!.id);
    expect(balance.data?.currentBalance).toBe(1_500);
    expect(balance.data?.isNegative).toBe(false);

    await expect(
      service.assertSufficientBalance(created.data!.id, 2_000),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.assertSufficientBalance(created.data!.id, 1_000);

    const ledger = await service.getLedger(created.data!.id, {
      page: 1,
      limit: 20,
    });
    expect(ledger.data).toHaveLength(1);
    expect(ledger.data?.[0].runningBalance).toBe(1_500);
  });

  it('closes only when balance is zero', async () => {
    const withBalance = await createPetty(100);
    await expect(
      service.close(withBalance.data!.id, managerId),
    ).rejects.toBeInstanceOf(BadRequestException);

    const zero = await createPetty(0);
    const closed = await service.close(zero.data!.id, managerId, {
      reason: 'Project complete',
    });
    expect(closed.data?.status).toBe(CashAccountStatus.Closed);

    await expect(
      service.initiateCustodianTransfer(
        zero.data!.id,
        { toUserId: custodianB },
        managerId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels a pending handover', async () => {
    const created = await createPetty();
    await service.initiateCustodianTransfer(
      created.data!.id,
      { toUserId: custodianB },
      managerId,
    );
    const cancelled = await service.cancelHandover(
      created.data!.id,
      managerId,
    );
    expect(cancelled.data?.status).toBe(CashAccountStatus.Active);
    expect(cancelled.data?.pendingHandover).toBeNull();
    expect(cancelled.data?.custodianUserId).toBe(custodianA);
  });

  it('rejects concurrent handovers', async () => {
    const created = await createPetty();
    await service.initiateCustodianTransfer(
      created.data!.id,
      { toUserId: custodianB },
      managerId,
    );
    await expect(
      service.initiateCustodianTransfer(
        created.data!.id,
        { toUserId: custodianB },
        managerId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
