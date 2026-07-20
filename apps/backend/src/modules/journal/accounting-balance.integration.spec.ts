import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { withTransaction } from '../../database/utils/transaction.helper';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalStatus,
} from './schemas/journal-entry.schema';

/**
 * Accounting-balance integration: posted journals stay balanced and
 * ledger balances move only via posted debit/credit lines.
 */
describe('Accounting balance (integration)', () => {
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let journalModel: Model<JournalEntry>;
  let accountModel: Model<Account>;
  let bankId: Types.ObjectId;
  let cashId: Types.ObjectId;
  let fyId: Types.ObjectId;

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

    const [bank, cash] = await accountModel.create([
      {
        accountCode: '1110',
        accountName: 'Bank',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        level: 1,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: false,
        requiresParty: false,
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
        requiresProject: false,
        requiresParty: false,
        postingCount: 0,
      },
    ]);
    bankId = bank._id as Types.ObjectId;
    cashId = cash._id as Types.ObjectId;
    fyId = new Types.ObjectId();
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (replSet) await replSet.stop();
  });

  beforeEach(async () => {
    await journalModel.deleteMany({}).setOptions({ withDeleted: true });
  });

  async function ledgerBalance(accountId: Types.ObjectId): Promise<number> {
    const [agg] = await journalModel
      .aggregate<{ balance: number }>([
        { $match: { status: JournalStatus.Posted } },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': accountId } },
        {
          $group: {
            _id: null,
            debit: { $sum: '$lines.debit' },
            credit: { $sum: '$lines.credit' },
          },
        },
        {
          $project: {
            balance: { $subtract: ['$debit', '$credit'] },
          },
        },
      ])
      .exec();
    return Math.round(((agg?.balance ?? 0) + Number.EPSILON) * 100) / 100;
  }

  it('posts a balanced transfer inside a transaction and updates ledger balances', async () => {
    const amount = 2_500;

    await withTransaction(connection, async (session) => {
      await journalModel.create(
        [
          {
            journalNumber: 'JV-BAL-1',
            journalDate: new Date('2026-07-15'),
            financialYearId: fyId,
            narration: 'Cash to bank',
            status: JournalStatus.Posted,
            totalDebit: amount,
            totalCredit: amount,
            postedAt: new Date('2026-07-15'),
            postedBy: new Types.ObjectId(),
            lines: [
              { accountId: bankId, debit: amount, credit: 0 },
              { accountId: cashId, debit: 0, credit: amount },
            ],
          },
        ],
        { session },
      );
    });

    const bankBal = await ledgerBalance(bankId);
    const cashBal = await ledgerBalance(cashId);
    expect(bankBal).toBe(amount);
    expect(cashBal).toBe(-amount);

    const [row] = await journalModel.find({ journalNumber: 'JV-BAL-1' }).lean();
    expect(row.totalDebit).toBe(row.totalCredit);
  });

  it('rolls back unbalanced work when the transaction aborts', async () => {
    await expect(
      withTransaction(connection, async (session) => {
        await journalModel.create(
          [
            {
              journalNumber: 'JV-BAL-ABORT',
              journalDate: new Date('2026-07-16'),
              financialYearId: fyId,
              narration: 'Will abort',
              status: JournalStatus.Posted,
              totalDebit: 100,
              totalCredit: 100,
              postedAt: new Date(),
              lines: [
                { accountId: bankId, debit: 100, credit: 0 },
                { accountId: cashId, debit: 0, credit: 100 },
              ],
            },
          ],
          { session },
        );
        throw new Error('force abort');
      }),
    ).rejects.toThrow('force abort');

    const count = await journalModel.countDocuments({
      journalNumber: 'JV-BAL-ABORT',
    });
    expect(count).toBe(0);
    expect(await ledgerBalance(bankId)).toBe(0);
  });
});
