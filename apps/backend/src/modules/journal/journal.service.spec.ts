import {
  BadRequestException,
  ConflictException,
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
import { DatabaseService } from '../../database/services/database.service';
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
  JournalPartyType,
  JournalStatus,
} from './schemas/journal-entry.schema';

describe('JournalService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let journalModel: Model<JournalEntry>;
  let accountModel: Model<Account>;
  let fyModel: Model<FinancialYear>;
  let service: JournalService;
  let companyId: string;
  let bankId: string;
  let cashId: string;
  let vendorPayableId: string;
  let controlId: string;
  const actorId = new Types.ObjectId().toHexString();
  const partyId = new Types.ObjectId().toHexString();
  const projectId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    journalModel = connection.model(
      JournalEntry.name,
      JournalEntrySchema,
    ) as Model<JournalEntry>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    fyModel = connection.model(
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
      idempotencyModel.syncIndexes(),
      auditModel.syncIndexes(),
    ]);

    const databaseService = {
      withTransaction: async <T>(work: (session: null) => Promise<T>) =>
        work(null),
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
      {
        assertProjectAccess: jest.fn().mockResolvedValue({ allowed: true }),
        assertOptionalProjectAccess: jest.fn().mockResolvedValue(undefined),
        mergeAuthorisedProjectFilter: jest
          .fn()
          .mockImplementation(async (_actor: string, filter: unknown) => filter),
      } as never,
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    await journalModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await fyModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Company.name).deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).collection.deleteMany({});
    await connection.model(AuditLog.name).collection.deleteMany({});

    const [company] = await connection.model(Company.name).create([
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
    companyId = String(company._id);

    await fyModel.create({
      companyId: company._id,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      status: FinancialYearStatus.Open,
      isCurrent: true,
      isLocked: false,
    });

    const [bank, cash, vendor, control] = await accountModel.create([
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
      {
        accountCode: '2110',
        accountName: 'Vendor Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.VendorPayable,
        level: 1,
        isControlAccount: false,
        allowManualPosting: true,
        requiresProject: true,
        requiresParty: true,
        postingCount: 0,
      },
      {
        accountCode: '1000',
        accountName: 'Assets',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Control,
        level: 1,
        isControlAccount: true,
        allowManualPosting: false,
        requiresProject: false,
        requiresParty: false,
        postingCount: 0,
      },
    ]);
    bankId = String(bank._id);
    cashId = String(cash._id);
    vendorPayableId = String(vendor._id);
    controlId = String(control._id);
  });

  function balancedBankCash(amount = 5_000) {
    return {
      journalDate: '2026-07-15',
      narration: 'Transfer cash to bank',
      lines: [
        { accountId: bankId, debit: amount, credit: 0 },
        { accountId: cashId, debit: 0, credit: amount },
      ],
    };
  }

  it('creates and posts a balanced journal with JV number', async () => {
    const created = await service.create(balancedBankCash(), actorId);
    expect(created.data?.status).toBe(JournalStatus.Draft);
    expect(created.data?.journalNumber).toMatch(/^JV-\d{4}-\d{6}$/);
    expect(created.data?.totalDebit).toBe(created.data?.totalCredit);

    const posted = await service.post(created.data!.id, actorId);
    expect(posted.data?.status).toBe(JournalStatus.Posted);
    expect(posted.data?.postedBy).toBe(actorId);

    const bank = await accountModel.findById(bankId).lean();
    expect(bank?.postingCount).toBe(1);
  });

  it('rejects unbalanced entries and dual-sided lines', async () => {
    await expect(
      service.create(
        {
          journalDate: '2026-07-15',
          narration: 'bad',
          lines: [
            { accountId: bankId, debit: 100, credit: 0 },
            { accountId: cashId, debit: 0, credit: 50 },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.create(
        {
          journalDate: '2026-07-15',
          narration: 'bad',
          lines: [
            { accountId: bankId, debit: 100, credit: 100 },
            { accountId: cashId, debit: 0, credit: 0 },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps draft update blocked on posted journals; amend and reverse work', async () => {
    const created = await service.create(
      { ...balancedBankCash(), post: true },
      actorId,
    );
    expect(created.data?.status).toBe(JournalStatus.Posted);

    await expect(
      service.update(
        created.data!.id,
        { narration: 'tamper' },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const amended = await service.amendPosted(
      created.data!.id,
      { narration: 'Corrected in place', lines: balancedBankCash().lines },
      actorId,
    );
    expect(amended.data?.journalNumber).toBe(created.data!.journalNumber);
    expect(amended.data?.status).toBe(JournalStatus.Posted);
    expect(amended.data?.narration).toBe('Corrected in place');

    const reversed = await service.reverse(created.data!.id, actorId);
    expect(reversed.data?.original.status).toBe(JournalStatus.Reversed);
    expect(reversed.data?.reversal.status).toBe(JournalStatus.Posted);
    expect(reversed.data?.reversal.reversalOf).toBe(created.data!.id);
    expect(reversed.data?.reversal.lines[0].debit).toBe(
      created.data!.lines[0].credit,
    );

    await expect(
      service.reverse(created.data!.id, actorId),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.amendPosted(
        created.data!.id,
        { narration: 'too late' },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects postings in locked financial years', async () => {
    const created = await service.create(balancedBankCash(), actorId);
    await fyModel.updateOne(
      { companyId: new Types.ObjectId(companyId) },
      { $set: { isLocked: true, status: FinancialYearStatus.Locked } },
    );

    await expect(service.post(created.data!.id, actorId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('enforces required project and party dimensions', async () => {
    await expect(
      service.create(
        {
          journalDate: '2026-07-15',
          narration: 'Vendor bill',
          lines: [
            { accountId: bankId, debit: 0, credit: 1_000 },
            {
              accountId: vendorPayableId,
              debit: 1_000,
              credit: 0,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toThrow(/requires a project/i);

    await expect(
      service.create(
        {
          journalDate: '2026-07-15',
          projectId,
          narration: 'Vendor bill',
          lines: [
            { accountId: bankId, debit: 0, credit: 1_000 },
            {
              accountId: vendorPayableId,
              debit: 1_000,
              credit: 0,
              projectId,
            },
          ],
        },
        actorId,
      ),
    ).rejects.toThrow(/requires a party/i);

    const ok = await service.create(
      {
        journalDate: '2026-07-15',
        projectId,
        narration: 'Vendor bill',
        lines: [
          { accountId: bankId, debit: 0, credit: 1_000 },
          {
            accountId: vendorPayableId,
            debit: 1_000,
            credit: 0,
            projectId,
            partyType: JournalPartyType.Vendor,
            partyId,
          },
        ],
        post: true,
      },
      actorId,
    );
    expect(ok.data?.status).toBe(JournalStatus.Posted);
  });

  it('blocks manual posting to control accounts', async () => {
    await expect(
      service.create(
        {
          journalDate: '2026-07-15',
          narration: 'control',
          lines: [
            { accountId: controlId, debit: 100, credit: 0 },
            { accountId: cashId, debit: 0, credit: 100 },
          ],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents duplicate idempotency keys and replays completed responses', async () => {
    const key = 'jv-idem-1';
    const first = await service.create(balancedBankCash(), actorId, key);
    const replay = await service.create(balancedBankCash(), actorId, key);
    expect(replay.data?.id).toBe(first.data?.id);

    await expect(
      service.create(
        { ...balancedBankCash(9_999), narration: 'different payload' },
        actorId,
        key,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('supports submit, cancel, and list filters', async () => {
    const draft = await service.create(balancedBankCash(), actorId);
    const pending = await service.submitForApproval(draft.data!.id, actorId);
    expect(pending.data?.status).toBe(JournalStatus.PendingApproval);

    const other = await service.create(balancedBankCash(1_000), actorId);
    const cancelled = await service.cancel(other.data!.id, actorId, {
      reason: 'mistake',
    });
    expect(cancelled.data?.status).toBe(JournalStatus.Cancelled);

    const listed = await service.list({
      status: JournalStatus.PendingApproval,
      page: 1,
      limit: 10,
    });
    expect(listed.data).toHaveLength(1);
  });
});
