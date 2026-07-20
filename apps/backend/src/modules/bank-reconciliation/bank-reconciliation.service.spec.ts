import { BadRequestException } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  AuditAction,
  AuditLog,
  AuditLogSchema,
} from '../audit-log/schemas/audit-log.schema';
import {
  Account,
  AccountCategory,
  AccountSchema,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import {
  BankAccountStatus,
  BankAccountType,
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import type { JournalService } from '../journal/journal.service';
import {
  JournalEntry,
  JournalEntrySchema,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  BankReconciliationAdjustmentType,
  BankReconciliationMatchCriterion,
  BankReconciliationMatchStatus,
  BankStatementLineStatus,
} from './bank-reconciliation.constants';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankStatementImportService } from './bank-statement-import.service';
import {
  BankReconciliationMatch,
  BankReconciliationMatchSchema,
} from './schemas/bank-reconciliation-match.schema';
import {
  BankReconciliationSession,
  BankReconciliationSessionSchema,
} from './schemas/bank-reconciliation-session.schema';
import {
  BankStatementLine,
  BankStatementLineSchema,
} from './schemas/bank-statement-line.schema';

describe('BankReconciliationService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let sessionModel: Model<BankReconciliationSession>;
  let lineModel: Model<BankStatementLine>;
  let matchModel: Model<BankReconciliationMatch>;
  let bankModel: Model<CompanyBankAccount>;
  let journalModel: Model<JournalEntry>;
  let accountModel: Model<Account>;
  let auditModel: Model<AuditLog>;
  let service: BankReconciliationService;
  let journalService: { create: jest.Mock };

  let bankLedgerId: Types.ObjectId;
  let cashLedgerId: Types.ObjectId;
  let expenseLedgerId: Types.ObjectId;
  let bankAccountId: string;
  let fyId: Types.ObjectId;
  const actorId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    sessionModel = connection.model(
      BankReconciliationSession.name,
      BankReconciliationSessionSchema,
    ) as Model<BankReconciliationSession>;
    lineModel = connection.model(
      BankStatementLine.name,
      BankStatementLineSchema,
    ) as Model<BankStatementLine>;
    matchModel = connection.model(
      BankReconciliationMatch.name,
      BankReconciliationMatchSchema,
    ) as Model<BankReconciliationMatch>;
    bankModel = connection.model(
      CompanyBankAccount.name,
      CompanyBankAccountSchema,
    ) as Model<CompanyBankAccount>;
    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    auditModel = connection.model(
      AuditLog.name,
      AuditLogSchema,
    ) as Model<AuditLog>;

    await Promise.all([
      sessionModel.syncIndexes(),
      lineModel.syncIndexes(),
      matchModel.syncIndexes(),
      bankModel.syncIndexes(),
      journalModel.syncIndexes(),
      accountModel.syncIndexes(),
      auditModel.syncIndexes(),
    ]);

    journalService = {
      create: jest.fn(),
    };

    service = new BankReconciliationService(
      sessionModel,
      lineModel,
      matchModel,
      bankModel,
      journalModel,
      accountModel,
      new BankStatementImportService(),
      journalService as unknown as JournalService,
      new AuditLogService(auditModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      sessionModel.deleteMany({}).setOptions({ withDeleted: true }),
      lineModel.deleteMany({}).setOptions({ withDeleted: true }),
      matchModel.deleteMany({}).setOptions({ withDeleted: true }),
      bankModel.deleteMany({}).setOptions({ withDeleted: true }),
      journalModel.deleteMany({}).setOptions({ withDeleted: true }),
      accountModel.deleteMany({}).setOptions({ withDeleted: true }),
      auditModel.collection.deleteMany({}),
    ]);
    journalService.create.mockReset();

    fyId = new Types.ObjectId();
    const [bankAcc, cashAcc, expenseAcc] = await accountModel.create([
      {
        accountCode: '1110',
        accountName: 'HDFC Bank',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        level: 1,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: false,
        requiresParty: false,
        postingCount: 0,
        status: AccountStatus.Active,
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
        status: AccountStatus.Active,
      },
      {
        accountCode: '5200',
        accountName: 'Bank Charges',
        accountType: AccountType.Expense,
        accountCategory: AccountCategory.IndirectExpense,
        level: 1,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: false,
        requiresParty: false,
        postingCount: 0,
        status: AccountStatus.Active,
      },
    ]);
    bankLedgerId = bankAcc._id as Types.ObjectId;
    cashLedgerId = cashAcc._id as Types.ObjectId;
    expenseLedgerId = expenseAcc._id as Types.ObjectId;

    const [bank] = await bankModel.create([
      {
        accountCode: 'BA-001',
        bankName: 'HDFC',
        branch: 'Anna Nagar',
        accountHolderName: 'Luxaria',
        maskedAccountNumber: 'XXXX9012',
        encryptedAccountNumber: 'enc-test',
        ifsc: 'HDFC0001234',
        accountType: BankAccountType.Current,
        projectId: null,
        ledgerAccountId: bankLedgerId,
        openingBalance: 10_000,
        status: BankAccountStatus.Active,
        isDefault: true,
      },
    ]);
    bankAccountId = String(bank._id);
  });

  async function createSession() {
    const res = await service.createSession(
      {
        bankAccountId,
        statementFrom: '2026-07-01',
        statementTo: '2026-07-31',
        statementOpeningBalance: 10_000,
        statementClosingBalance: 13_800,
      },
      actorId,
    );
    return res.data as { id: string };
  }

  async function seedPostedJournal(input: {
    number: string;
    date: string;
    bankDebit: number;
    bankCredit: number;
    narration: string;
    description?: string;
  }) {
    const [row] = await journalModel.create([
      {
        journalNumber: input.number,
        journalDate: new Date(input.date),
        financialYearId: fyId,
        narration: input.narration,
        status: JournalStatus.Posted,
        totalDebit: Math.max(input.bankDebit, input.bankCredit),
        totalCredit: Math.max(input.bankDebit, input.bankCredit),
        postedAt: new Date(input.date),
        postedBy: new Types.ObjectId(actorId),
        lines: [
          {
            accountId: bankLedgerId,
            debit: input.bankDebit,
            credit: input.bankCredit,
            description: input.description ?? input.narration,
          },
          {
            accountId: cashLedgerId,
            debit: input.bankCredit,
            credit: input.bankDebit,
            description: input.description ?? input.narration,
          },
        ],
      },
    ]);
    const bankLine = row.lines.find(
      (l) => String(l.accountId) === String(bankLedgerId),
    ) as unknown as { _id: Types.ObjectId };
    return {
      journalId: String(row._id),
      journalLineId: String(bankLine._id),
    };
  }

  const mapping = {
    date: 'Txn Date',
    description: 'Narration',
    debit: 'Withdrawal',
    credit: 'Deposit',
    transactionId: 'Ref',
    chequeNumber: 'Cheque',
  };

  function csvFile(body: string): Express.Multer.File {
    return {
      buffer: Buffer.from(body, 'utf8'),
      originalname: 'july.csv',
      mimetype: 'text/csv',
      size: body.length,
      fieldname: 'file',
      encoding: '7bit',
      destination: '',
      filename: '',
      path: '',
      stream: undefined as never,
    };
  }

  it('imports CSV, auto-matches by txn id / cheque / amount+date, lists unmatched', async () => {
    const session = await createSession();
    const byTxn = await seedPostedJournal({
      number: 'JV-1001',
      date: '2026-07-10',
      bankDebit: 5000,
      bankCredit: 0,
      narration: 'Customer receipt UTR123',
      description: 'UTR123',
    });
    const byChq = await seedPostedJournal({
      number: 'JV-1002',
      date: '2026-07-12',
      bankDebit: 0,
      bankCredit: 1200,
      narration: 'Vendor payment CHQ-88',
      description: 'Cheque CHQ-88',
    });
    await seedPostedJournal({
      number: 'JV-1003',
      date: '2026-07-20',
      bankDebit: 0,
      bankCredit: 250,
      narration: 'Misc payment unmatched',
    });

    const csv = [
      'Txn Date,Narration,Withdrawal,Deposit,Ref,Cheque',
      '2026-07-10,NEFT IN,0,5000,UTR123,',
      '2026-07-12,Cheque paid,1200,0,,CHQ-88',
      '2026-07-18,Bank charges,45,0,CHG1,',
    ].join('\n');

    const imported = await service.importStatement(
      session.id,
      csvFile(csv),
      mapping,
      actorId,
    );
    expect(imported.data).toMatchObject({ importedCount: 3 });

    const auto = await service.autoMatch(session.id, {}, actorId);
    expect(auto.data).toMatchObject({ matchCount: 2 });

    const unmatched = await service.listUnmatched(session.id);
    const data = unmatched.data as {
      statementUnmatchedCount: number;
      bookUnmatchedCount: number;
      statementLines: Array<{ description: string }>;
    };
    expect(data.statementUnmatchedCount).toBe(1);
    expect(data.statementLines[0].description).toContain('Bank charges');
    expect(data.bookUnmatchedCount).toBe(1);

    const matches = await service.listMatches(session.id);
    const matchRows = matches.data as Array<{
      criteria: string[];
      bookLines: Array<{ journalLineId: string }>;
    }>;
    expect(matchRows).toHaveLength(2);
    expect(
      matchRows.some((m) =>
        m.criteria.includes(BankReconciliationMatchCriterion.TransactionId),
      ),
    ).toBe(true);
    expect(
      matchRows.some((m) =>
        m.criteria.includes(BankReconciliationMatchCriterion.ChequeNumber),
      ),
    ).toBe(true);
    expect(
      matchRows.some((m) =>
        m.bookLines.some((b) => b.journalLineId === byTxn.journalLineId),
      ),
    ).toBe(true);
    expect(
      matchRows.some((m) =>
        m.bookLines.some((b) => b.journalLineId === byChq.journalLineId),
      ),
    ).toBe(true);

    const audits = await auditModel.find({ module: 'bank_reconciliation' }).lean();
    expect(audits.some((a) => a.action === AuditAction.CREATE)).toBe(true);
    expect(audits.some((a) => a.entityType === 'bank_reconciliation_auto_match')).toBe(
      true,
    );
  });

  it('manual match and unmatch retain match history for traceability', async () => {
    const session = await createSession();
    const book = await seedPostedJournal({
      number: 'JV-2001',
      date: '2026-07-15',
      bankDebit: 3000,
      bankCredit: 0,
      narration: 'Receipt',
    });

    await service.importStatement(
      session.id,
      csvFile(
        [
          'Txn Date,Narration,Withdrawal,Deposit,Ref,Cheque',
          '2026-07-16,Deposit,0,3000,,',
        ].join('\n'),
      ),
      mapping,
      actorId,
    );

    const lines = await service.listStatementLines(session.id);
    const lineId = (lines.data as Array<{ id: string }>)[0].id;

    const matched = await service.manualMatch(
      session.id,
      {
        statementLineIds: [lineId],
        bookLines: [
          { journalId: book.journalId, journalLineId: book.journalLineId },
        ],
        notes: 'Manual confirm',
      },
      actorId,
    );
    const matchId = (matched.data as { id: string }).id;

    const lineAfter = await lineModel.findById(lineId).lean();
    expect(lineAfter?.status).toBe(BankStatementLineStatus.Matched);
    expect(String(lineAfter?.matchId)).toBe(matchId);

    await service.unmatch(session.id, matchId, actorId);

    const matchDoc = await matchModel.findById(matchId).lean();
    expect(matchDoc?.status).toBe(BankReconciliationMatchStatus.Undone);
    expect(matchDoc?.bookLines?.[0]?.journalNumber).toBe('JV-2001');
    expect(matchDoc?.statementLineIds?.map(String)).toContain(lineId);

    const lineRestored = await lineModel.findById(lineId).lean();
    expect(lineRestored?.status).toBe(BankStatementLineStatus.Unmatched);
    expect(lineRestored?.matchId).toBeNull();

    const history = await service.listMatches(session.id);
    expect((history.data as unknown[]).length).toBe(1);

    const unmatchAudits = await auditModel
      .find({ entityType: 'bank_reconciliation_unmatch' })
      .lean();
    expect(unmatchAudits).toHaveLength(1);
    expect(unmatchAudits[0].beforeData).toBeTruthy();
    expect(unmatchAudits[0].afterData).toBeTruthy();
  });

  it('posts bank charges via journal and builds reconciliation statement', async () => {
    const session = await createSession();
    await service.importStatement(
      session.id,
      csvFile(
        [
          'Txn Date,Narration,Withdrawal,Deposit,Ref,Cheque',
          '2026-07-28,Bank charges,250,0,CHG-9,',
        ].join('\n'),
      ),
      mapping,
      actorId,
    );
    const lines = await service.listStatementLines(session.id);
    const statementLineId = (lines.data as Array<{ id: string }>)[0].id;

    const adjJournalId = new Types.ObjectId();
    const adjLineId = new Types.ObjectId();
    journalService.create.mockImplementation(async () => {
      await journalModel.create({
        _id: adjJournalId,
        journalNumber: 'JV-CHG-1',
        journalDate: new Date('2026-07-28'),
        financialYearId: fyId,
        narration: 'Bank charges for July',
        status: JournalStatus.Posted,
        totalDebit: 250,
        totalCredit: 250,
        postedAt: new Date('2026-07-28'),
        postedBy: new Types.ObjectId(actorId),
        sourceModule: 'bank_reconciliation',
        sourceEntityType: 'bank_reconciliation_session',
        sourceEntityId: session.id,
        lines: [
          {
            _id: adjLineId,
            accountId: bankLedgerId,
            debit: 0,
            credit: 250,
            description: 'Bank charges for July',
          },
          {
            accountId: expenseLedgerId,
            debit: 250,
            credit: 0,
            description: 'Bank charges for July',
          },
        ],
      });
      return createSuccessResponse({
        id: String(adjJournalId),
        journalNumber: 'JV-CHG-1',
        lines: [{ id: String(adjLineId), accountId: String(bankLedgerId) }],
      });
    });

    const posted = await service.postAdjustment(
      session.id,
      {
        adjustmentType: BankReconciliationAdjustmentType.BankCharges,
        journalDate: '2026-07-28',
        amount: 250,
        narration: 'Bank charges for July',
        statementLineId,
      },
      actorId,
    );

    expect(journalService.create).toHaveBeenCalled();
    expect(posted.data).toMatchObject({
      journalId: String(adjJournalId),
      adjustmentType: BankReconciliationAdjustmentType.BankCharges,
      amount: 250,
    });
    expect(
      (posted.data as { autoMatched: { id: string } | null }).autoMatched,
    ).toBeTruthy();

    const statement = await service.getReconciliationStatement(session.id);
    const stmt = statement.data as {
      matchedCount: number;
      unmatchedStatementCount: number;
      statementClosingBalance: number;
      bookBalanceAsOfStatementTo: number;
    };
    expect(stmt.matchedCount).toBe(1);
    expect(stmt.unmatchedStatementCount).toBe(0);
    expect(stmt.statementClosingBalance).toBe(13_800);
    expect(stmt.bookBalanceAsOfStatementTo).toBe(10_000 - 250);

    const postAudits = await auditModel
      .find({ entityType: 'bank_reconciliation_adjustment' })
      .lean();
    expect(postAudits).toHaveLength(1);
    expect(postAudits[0].action).toBe(AuditAction.POST);
  });

  it('rejects re-import without replaceExisting', async () => {
    const session = await createSession();
    const csv = [
      'Txn Date,Narration,Withdrawal,Deposit,Ref,Cheque',
      '2026-07-01,x,0,1,,',
    ].join('\n');
    await service.importStatement(session.id, csvFile(csv), mapping, actorId);
    await expect(
      service.importStatement(session.id, csvFile(csv), mapping, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
