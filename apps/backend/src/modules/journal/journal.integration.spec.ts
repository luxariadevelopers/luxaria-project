import { ForbiddenException } from '@nestjs/common';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import { DatabaseService } from '../../database/services/database.service';
import { withTransaction } from '../../database/utils/transaction.helper';
import {
  AccountingPeriod,
  AccountingPeriodSchema,
} from '../accounting-period-closure/schemas/accounting-period.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  AuditLog,
  AuditLogSchema,
} from '../audit-log/schemas/audit-log.schema';
import { ChartOfAccountsService } from '../chart-of-accounts/chart-of-accounts.service';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  Company,
  CompanySchema,
  CompanyStatus,
} from '../company/schemas/company.schema';
import { FinancialYearService } from '../financial-year/financial-year.service';
import {
  FinancialYearUnlockRequest,
  FinancialYearUnlockRequestSchema,
} from '../financial-year/schemas/financial-year-unlock-request.schema';
import {
  FinancialYear,
  FinancialYearSchema,
  FinancialYearStatus,
} from '../financial-year/schemas/financial-year.schema';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { JournalService } from './journal.service';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalStatus,
} from './schemas/journal-entry.schema';

/**
 * Integration tests using a replica-set (required for MongoDB multi-doc transactions).
 */
describe('JournalService integration (transactions)', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let journalModel: Model<JournalEntry>;
  let accountModel: Model<Account>;
  let service: JournalService;
  let bankId: string;
  let cashId: string;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoose = await connect(replSet.getUri());
    connection = mongoose.connection;

    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const fyModel = connection.model(
      FinancialYear.name,
      FinancialYearSchema,
    ) as Model<FinancialYear>;
    const unlockModel = connection.model(
      FinancialYearUnlockRequest.name,
      FinancialYearUnlockRequestSchema,
    ) as Model<FinancialYearUnlockRequest>;
    const companyModel = connection.model(
      Company.name,
      CompanySchema,
    ) as Model<Company>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;
    const auditModel = connection.model(
      AuditLog.name,
      AuditLogSchema,
    ) as Model<AuditLog>;

    await Promise.all([
      journalModel.syncIndexes(),
      accountModel.syncIndexes(),
      fyModel.syncIndexes(),
      companyModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    const databaseService = {
      withTransaction: <T>(work: Parameters<typeof withTransaction<T>>[1]) =>
        withTransaction(connection, work),
    } as unknown as DatabaseService;

    const periodModel = connection.model(
      AccountingPeriod.name,
      AccountingPeriodSchema,
    ) as Model<AccountingPeriod>;

    service = new JournalService(
      journalModel,
      new NumberingService(counterModel),
      new FinancialYearService(fyModel, unlockModel, companyModel, periodModel),
      new ChartOfAccountsService(accountModel),
      databaseService,
      new IdempotencyService(idempotencyModel),
      new AuditLogService(auditModel),
    );

    const [company] = await companyModel.create([
      {
        companyCode: 'CMP-0001',
        legalName: 'Luxaria Developers Pvt. Ltd.',
        tradeName: 'Luxaria',
        registeredAddress: {
          line1: 'Office',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        corporateAddress: {
          line1: 'Office',
          line2: null,
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          country: 'India',
        },
        authorisedShareCapital: 10_000_000,
        paidUpShareCapital: 0,
        financialYearStartMonth: 4,
        status: CompanyStatus.Active,
        isPrimary: true,
      },
    ]);

    await fyModel.create({
      companyId: company._id,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      status: FinancialYearStatus.Open,
      isCurrent: true,
      isLocked: false,
    });

    const [bank, cash] = await accountModel.create([
      {
        accountCode: '1110',
        accountName: 'Bank',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        level: 1,
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
        isControlAccount: false,
        allowManualPosting: true,
        postingCount: 0,
      },
    ]);
    bankId = String(bank._id);
    cashId = String(cash._id);
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    await journalModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await accountModel.updateMany({}, { $set: { postingCount: 0 } });
    await connection.model(AuditLog.name).collection.deleteMany({});
  });

  it('posts and reverses inside MongoDB transactions', async () => {
    const created = await service.create(
      {
        journalDate: '2026-07-15',
        narration: 'Txn transfer',
        lines: [
          { accountId: bankId, debit: 2_500, credit: 0 },
          { accountId: cashId, debit: 0, credit: 2_500 },
        ],
      },
      actorId,
    );

    const posted = await service.post(created.data!.id, actorId);
    expect(posted.data?.status).toBe(JournalStatus.Posted);

    const bankAfterPost = await accountModel.findById(bankId).lean();
    expect(bankAfterPost?.postingCount).toBe(1);

    const reversed = await service.reverse(created.data!.id, actorId, {
      narration: 'Correcting txn transfer',
    });
    expect(reversed.data?.original.status).toBe(JournalStatus.Reversed);
    expect(reversed.data?.reversal.totalDebit).toBe(2_500);

    const bankAfterReverse = await accountModel.findById(bankId).lean();
    expect(bankAfterReverse?.postingCount).toBe(2);

    const audits = await connection.model(AuditLog.name).find({}).lean();
    expect(audits.some((a) => a.action === 'POST')).toBe(true);
    expect(audits.some((a) => a.action === 'REVERSE')).toBe(true);
  });

  it('rolls back posting when financial year becomes locked mid-flow', async () => {
    const created = await service.create(
      {
        journalDate: '2026-07-15',
        narration: 'Will fail post',
        lines: [
          { accountId: bankId, debit: 100, credit: 0 },
          { accountId: cashId, debit: 0, credit: 100 },
        ],
      },
      actorId,
    );

    await connection.model(FinancialYear.name).updateOne(
      {},
      { $set: { isLocked: true, status: FinancialYearStatus.Locked } },
    );

    await expect(service.post(created.data!.id, actorId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const stillDraft = await journalModel.findById(created.data!.id).lean();
    expect(stillDraft?.status).toBe(JournalStatus.Draft);

    const bank = await accountModel.findById(bankId).lean();
    expect(bank?.postingCount).toBe(0);

    // unlock for subsequent tests
    await connection.model(FinancialYear.name).updateOne(
      {},
      { $set: { isLocked: false, status: FinancialYearStatus.Open } },
    );
  });
});
