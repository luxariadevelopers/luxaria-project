import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { isEncryptedSensitive } from '../../common/utils/crypto.util';
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
import type { PermissionsService } from '../rbac/permissions.service';
import { CompanyBankAccountsService } from './company-bank-accounts.service';
import {
  BankAccountStatus,
  BankAccountType,
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from './schemas/company-bank-account.schema';

describe('CompanyBankAccountsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let bankModel: Model<CompanyBankAccount>;
  let accountModel: Model<Account>;
  let journalModel: Model<JournalEntry>;
  let service: CompanyBankAccountsService;
  let permissionsService: { resolveUserAccess: jest.Mock };

  let ledgerAccountId: string;
  let cashLedgerId: string;
  let projectId: string;
  const actorId = new Types.ObjectId().toHexString();
  const encryptionKey = 'luxaria-test-field-encryption-key-32b!!';

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    bankModel = connection.model(
      CompanyBankAccount.name,
      CompanyBankAccountSchema,
    ) as Model<CompanyBankAccount>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    const projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      bankModel.syncIndexes(),
      accountModel.syncIndexes(),
      journalModel.syncIndexes(),
      projectModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    permissionsService = {
      resolveUserAccess: jest.fn(),
    };

    const configService = {
      getOrThrow: (key: string) => {
        if (key === 'fieldEncryptionKey') return encryptionKey;
        throw new Error(`Missing config ${key}`);
      },
    } as unknown as ConfigService;

    service = new CompanyBankAccountsService(
      bankModel,
      accountModel,
      projectModel,
      journalModel,
      new NumberingService(counterModel),
      configService,
      permissionsService as unknown as PermissionsService,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await bankModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await journalModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Project.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    permissionsService.resolveUserAccess.mockResolvedValue({
      userId: actorId,
      roleIds: [],
      roleCodes: [],
      permissions: ['bank.view'],
      bypassPermissions: false,
    });

    const [bankLedger, cashLedger] = await accountModel.create([
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
      {
        accountCode: '1120',
        accountName: 'Cash',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Cash,
        level: 1,
        status: AccountStatus.Active,
        isControlAccount: false,
        allowManualPosting: true,
        postingCount: 0,
      },
    ]);
    ledgerAccountId = String(bankLedger._id);
    cashLedgerId = String(cashLedger._id);

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
  });

  it('creates encrypted bank account with masked number and BA code', async () => {
    const created = await service.create(
      {
        bankName: 'HDFC Bank',
        branch: 'T Nagar',
        accountHolderName: 'Luxaria Developers Pvt. Ltd.',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
        accountType: BankAccountType.Current,
        ledgerAccountId,
        openingBalance: 100_000,
      },
      actorId,
    );

    expect(created.data?.accountCode).toMatch(/^BA-\d{4}$/);
    expect(created.data?.maskedAccountNumber).toBe('XXXXXX9012');
    expect(created.data?.accountNumber).toBeNull();

    const raw = await bankModel
      .findById(created.data!.id)
      .select('+encryptedAccountNumber')
      .lean();
    expect(isEncryptedSensitive(raw!.encryptedAccountNumber)).toBe(true);
    expect(raw!.encryptedAccountNumber.includes('123456789012')).toBe(false);
  });

  it('restricts full account number unless bank.view_sensitive / bank.manage', async () => {
    const created = await service.create(
      {
        bankName: 'ICICI',
        accountHolderName: 'Luxaria',
        accountNumber: '998877665544',
        ifsc: 'ICIC0000456',
        accountType: BankAccountType.Savings,
        ledgerAccountId,
      },
      actorId,
    );

    const maskedView = await service.getById(created.data!.id, actorId);
    expect(maskedView.data?.accountNumber).toBeNull();
    expect(maskedView.data?.maskedAccountNumber).toBe('XXXXXX5544');

    permissionsService.resolveUserAccess.mockResolvedValueOnce({
      userId: actorId,
      roleIds: [],
      roleCodes: [],
      permissions: ['bank.view', 'bank.view_sensitive'],
      bypassPermissions: false,
    });
    const sensitive = await service.getById(created.data!.id, actorId);
    expect(sensitive.data?.accountNumber).toBe('998877665544');
  });

  it('rejects non-bank ledger accounts and invalid IFSC', async () => {
    await expect(
      service.create(
        {
          bankName: 'HDFC',
          accountHolderName: 'Luxaria',
          accountNumber: '123456789012',
          ifsc: 'BAD',
          accountType: BankAccountType.Current,
          ledgerAccountId,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        {
          bankName: 'HDFC',
          accountHolderName: 'Luxaria',
          accountNumber: '123456789012',
          ifsc: 'HDFC0001234',
          accountType: BankAccountType.Current,
          ledgerAccountId: cashLedgerId,
        },
        actorId,
      ),
    ).rejects.toThrow(/Bank category/i);
  });

  it('assigns a single default project bank account', async () => {
    const a = await service.create(
      {
        bankName: 'HDFC',
        accountHolderName: 'Luxaria',
        accountNumber: '111122223333',
        ifsc: 'HDFC0001111',
        accountType: BankAccountType.Current,
        projectId,
        ledgerAccountId,
        isDefault: true,
      },
      actorId,
    );
    expect(a.data?.isDefault).toBe(true);

    const b = await service.create(
      {
        bankName: 'SBI',
        accountHolderName: 'Luxaria',
        accountNumber: '444455556666',
        ifsc: 'SBIN0002222',
        accountType: BankAccountType.Current,
        projectId,
        ledgerAccountId,
      },
      actorId,
    );

    await service.setDefault(b.data!.id, actorId, { projectId });
    const afterA = await bankModel.findById(a.data!.id).lean();
    const afterB = await bankModel.findById(b.data!.id).lean();
    expect(afterA?.isDefault).toBe(false);
    expect(afterB?.isDefault).toBe(true);
  });

  it('activates / deactivates and computes balance from journals', async () => {
    const created = await service.create(
      {
        bankName: 'HDFC',
        accountHolderName: 'Luxaria',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
        accountType: BankAccountType.Current,
        ledgerAccountId,
        openingBalance: 10_000,
      },
      actorId,
    );

    await journalModel.create({
      journalNumber: 'JV-2026-000001',
      journalDate: new Date('2026-07-01'),
      financialYearId: new Types.ObjectId(),
      narration: 'Receipt',
      status: JournalStatus.Posted,
      totalDebit: 5_000,
      totalCredit: 5_000,
      lines: [
        {
          accountId: new Types.ObjectId(ledgerAccountId),
          debit: 5_000,
          credit: 0,
          description: 'Inflow',
        },
        {
          accountId: new Types.ObjectId(cashLedgerId),
          debit: 0,
          credit: 5_000,
          description: 'Out',
        },
      ],
    });

    const balance = await service.getBalance(created.data!.id);
    expect(balance.data?.openingBalance).toBe(10_000);
    expect(balance.data?.totalDebit).toBe(5_000);
    expect(balance.data?.currentBalance).toBe(15_000);

    const ledger = await service.getLedger(created.data!.id, {
      page: 1,
      limit: 20,
    });
    expect(ledger.data).toHaveLength(1);
    expect(ledger.data?.[0].runningBalance).toBe(15_000);

    const off = await service.deactivate(created.data!.id, actorId);
    expect(off.data?.status).toBe(BankAccountStatus.Inactive);
    const on = await service.activate(created.data!.id, actorId);
    expect(on.data?.status).toBe(BankAccountStatus.Active);
  });
});
