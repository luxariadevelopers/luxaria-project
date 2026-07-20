import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import {
  IdempotencyKey,
  IdempotencyKeySchema,
} from '../../database/schemas/idempotency-key.schema';
import { IdempotencyService } from '../../database/services/idempotency.service';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import type { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import {
  BankAccountStatus,
  BankAccountType,
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import type { JournalService } from '../journal/journal.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import type { PettyCashRequirementsService } from '../petty-cash-requirements/petty-cash-requirements.service';
import { PettyCashRequirementStatus } from '../petty-cash-requirements/schemas/petty-cash-requirement.schema';
import { PettyCashFundTransfersService } from './petty-cash-fund-transfers.service';
import {
  PettyCashFundTransfer,
  PettyCashFundTransferSchema,
  PettyCashFundTransferStatus,
} from './schemas/petty-cash-fund-transfer.schema';

describe('PettyCashFundTransfersService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let transferModel: Model<PettyCashFundTransfer>;
  let bankModel: Model<CompanyBankAccount>;
  let service: PettyCashFundTransfersService;

  let cashAccountsService: { getById: jest.Mock };
  let requirementsService: {
    getById: jest.Mock;
    applyFundTransferPosted: jest.Mock;
  };
  let journalService: { create: jest.Mock };

  const projectId = new Types.ObjectId().toHexString();
  const requestId = new Types.ObjectId().toHexString();
  const pettyCashAccountId = new Types.ObjectId().toHexString();
  const pettyLedgerId = new Types.ObjectId().toHexString();
  const bankLedgerId = new Types.ObjectId().toHexString();
  const actorId = new Types.ObjectId().toHexString();
  const verifierId = new Types.ObjectId().toHexString();
  let bankAccountId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    transferModel = connection.model(
      PettyCashFundTransfer.name,
      PettyCashFundTransferSchema,
    ) as Model<PettyCashFundTransfer>;
    bankModel = connection.model(
      CompanyBankAccount.name,
      CompanyBankAccountSchema,
    ) as Model<CompanyBankAccount>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;
    const idempotencyModel = connection.model(
      IdempotencyKey.name,
      IdempotencyKeySchema,
    ) as Model<IdempotencyKey>;

    await Promise.all([
      transferModel.syncIndexes(),
      bankModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    cashAccountsService = { getById: jest.fn() };
    requirementsService = {
      getById: jest.fn(),
      applyFundTransferPosted: jest.fn(),
    };
    journalService = { create: jest.fn() };

    service = new PettyCashFundTransfersService(
      transferModel,
      bankModel,
      cashAccountsService as unknown as CashAccountsService,
      requirementsService as unknown as PettyCashRequirementsService,
      journalService as unknown as JournalService,
      new NumberingService(counterModel),
      new IdempotencyService(idempotencyModel),
    );
  }, 60_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await transferModel.deleteMany({}).setOptions({ withDeleted: true });
    await bankModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).deleteMany({});

    const bank = await bankModel.create({
      accountCode: 'BA-0001',
      bankName: 'HDFC',
      branch: 'Chennai',
      accountHolderName: 'Luxaria Developers',
      maskedAccountNumber: 'XXXXXX1234',
      encryptedAccountNumber: 'enc',
      ifsc: 'HDFC0001234',
      accountType: BankAccountType.Current,
      projectId: null,
      ledgerAccountId: new Types.ObjectId(bankLedgerId),
      openingBalance: 0,
      status: BankAccountStatus.Active,
      isDefault: true,
    });
    bankAccountId = String(bank._id);

    cashAccountsService.getById.mockResolvedValue({
      data: {
        id: pettyCashAccountId,
        kind: CashAccountKind.PettyCash,
        projectId,
        status: CashAccountStatus.Active,
        ledgerAccountId: pettyLedgerId,
      },
    });

    requirementsService.getById.mockResolvedValue({
      data: {
        id: requestId,
        projectId,
        pettyCashAccountId,
        status: PettyCashRequirementStatus.Approved,
        approvedAmount: 50_000,
        fundedAmount: null,
      },
    });
    requirementsService.applyFundTransferPosted.mockResolvedValue({});

    journalService.create.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString(), status: 'posted' },
    });
  });

  async function createDraft(overrides: Record<string, unknown> = {}) {
    return service.create(
      {
        projectId,
        requestId,
        sourceBankAccountId: bankAccountId,
        destinationPettyCashAccountId: pettyCashAccountId,
        transferDate: '2026-07-17',
        amount: 20_000,
        transactionReference: 'NEFT-001',
        paymentProof: 'uploads/proofs/neft-001.pdf',
        ...overrides,
      },
      actorId,
    );
  }

  it('creates a draft transfer with PCF number', async () => {
    const res = await createDraft();
    expect(res.data?.status).toBe(PettyCashFundTransferStatus.Draft);
    expect(res.data?.transferNumber).toMatch(/^PCF-\d{4}-\d{6}$/);
    expect(res.data?.amount).toBe(20_000);
  });

  it('replays create with the same idempotency key', async () => {
    const key = 'pcft-create-1';
    const first = await service.create(
      {
        projectId,
        requestId,
        sourceBankAccountId: bankAccountId,
        destinationPettyCashAccountId: pettyCashAccountId,
        transferDate: '2026-07-17',
        amount: 10_000,
        transactionReference: 'NEFT-IDEMP',
        paymentProof: 'proof.pdf',
      },
      actorId,
      key,
    );
    const second = await service.create(
      {
        projectId,
        requestId,
        sourceBankAccountId: bankAccountId,
        destinationPettyCashAccountId: pettyCashAccountId,
        transferDate: '2026-07-17',
        amount: 10_000,
        transactionReference: 'NEFT-IDEMP',
        paymentProof: 'proof.pdf',
      },
      actorId,
      key,
    );
    expect(second.data?.id).toBe(first.data?.id);
    expect(await transferModel.countDocuments()).toBe(1);
  });

  it('rejects amount greater than approved request balance', async () => {
    await expect(createDraft({ amount: 50_001 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects when prior committed transfers exhaust approved balance', async () => {
    await createDraft({ amount: 40_000 });
    await expect(createDraft({ amount: 15_000 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects destination that does not match the requirement account', async () => {
    await expect(
      createDraft({
        destinationPettyCashAccountId: new Types.ObjectId().toHexString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('verifies then posts with journal Dr petty cash / Cr bank', async () => {
    const created = await createDraft({ amount: 25_000 });
    const id = created.data!.id;

    const verified = await service.verify(id, verifierId);
    expect(verified.data?.status).toBe(PettyCashFundTransferStatus.Verified);

    const posted = await service.post(id, actorId);
    expect(posted.data?.status).toBe(PettyCashFundTransferStatus.Posted);
    expect(posted.data?.journalEntryId).toBeTruthy();

    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'petty_cash',
        sourceEntityType: 'fund_transfer',
        sourceEntityId: id,
        post: true,
        lines: [
          expect.objectContaining({
            accountId: pettyLedgerId,
            debit: 25_000,
            credit: 0,
          }),
          expect.objectContaining({
            accountId: bankLedgerId,
            debit: 0,
            credit: 25_000,
          }),
        ],
      }),
      actorId,
      `pcft-journal:${id}`,
    );

    expect(requirementsService.applyFundTransferPosted).toHaveBeenCalledWith(
      requestId,
      25_000,
      actorId,
    );
  });

  it('does not call journal or requirement funding before post', async () => {
    const created = await createDraft();
    await service.verify(created.data!.id, verifierId);
    expect(journalService.create).not.toHaveBeenCalled();
    expect(requirementsService.applyFundTransferPosted).not.toHaveBeenCalled();
  });

  it('replays post with default idempotency key', async () => {
    const created = await createDraft({ amount: 5_000 });
    const id = created.data!.id;
    await service.verify(id, verifierId);

    const first = await service.post(id, actorId);
    const second = await service.post(id, actorId);
    expect(second.data?.id).toBe(first.data?.id);
    expect(second.data?.status).toBe(PettyCashFundTransferStatus.Posted);
    expect(journalService.create).toHaveBeenCalledTimes(1);
  });

  it('requires payment proof before verify', async () => {
    const created = await createDraft({ paymentProof: null });
    await expect(
      service.verify(created.data!.id, verifierId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancels draft and frees approved balance for a new transfer', async () => {
    const first = await createDraft({ amount: 50_000 });
    await service.cancel(
      first.data!.id,
      { cancellationReason: 'Wrong bank' },
      actorId,
    );
    const second = await createDraft({ amount: 50_000 });
    expect(second.data?.status).toBe(PettyCashFundTransferStatus.Draft);
  });

  it('rejects posting a draft without verify', async () => {
    const created = await createDraft();
    await expect(service.post(created.data!.id, actorId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reports remaining approved balance', async () => {
    await createDraft({ amount: 12_000 });
    const bal = await service.getApprovedRequestBalance(requestId);
    expect(bal.data?.remainingApprovedBalance).toBe(38_000);
    expect(bal.data?.committedTransferAmount).toBe(12_000);
  });

  it('rejects create when requirement is not approved', async () => {
    requirementsService.getById.mockResolvedValue({
      data: {
        id: requestId,
        projectId,
        pettyCashAccountId,
        status: PettyCashRequirementStatus.Submitted,
        approvedAmount: 50_000,
        fundedAmount: null,
      },
    });
    await expect(createDraft()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('conflicts when posting a transfer that already has a journal', async () => {
    const created = await createDraft({ amount: 1_000 });
    const id = created.data!.id;
    await service.verify(id, verifierId);
    await transferModel.updateOne(
      { _id: id },
      {
        $set: {
          journalEntryId: new Types.ObjectId(),
          status: PettyCashFundTransferStatus.Verified,
        },
      },
    );
    await expect(service.post(id, actorId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
