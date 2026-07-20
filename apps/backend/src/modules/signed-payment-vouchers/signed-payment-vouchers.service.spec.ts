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
import type { DocumentsService } from '../documents/documents.service';
import {
  DocumentStatus,
  StoredDocument,
  StoredDocumentSchema,
} from '../documents/schemas/document.schema';
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
import { SignedPaymentVoucherPdfService } from './signed-payment-voucher-pdf.service';
import { SignedPaymentVouchersService } from './signed-payment-vouchers.service';
import {
  SignedPaymentVoucher,
  SignedPaymentVoucherSchema,
  SignedPaymentVoucherStatus,
  SignedPaymentVoucherType,
} from './schemas/signed-payment-voucher.schema';

describe('SignedPaymentVouchersService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let voucherModel: Model<SignedPaymentVoucher>;
  let projectModel: Model<Project>;
  let accountModel: Model<Account>;
  let documentModel: Model<StoredDocument>;
  let service: SignedPaymentVouchersService;

  let cashAccountsService: {
    getById: jest.Mock;
    assertSufficientBalance: jest.Mock;
  };
  let documentsService: {
    requireActiveDocument: jest.Mock;
    createActiveFromBuffer: jest.Mock;
  };
  let journalService: { create: jest.Mock; reverse: jest.Mock };
  let financialYearService: { assertPostingAllowed: jest.Mock };

  const actorId = new Types.ObjectId().toHexString();
  const approverId = new Types.ObjectId().toHexString();
  const posterId = new Types.ObjectId().toHexString();
  const pettyCashAccountId = new Types.ObjectId().toHexString();
  const pettyLedgerId = new Types.ObjectId().toHexString();
  let projectId: string;
  let expenseLedgerId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    voucherModel = connection.model(
      SignedPaymentVoucher.name,
      SignedPaymentVoucherSchema,
    ) as Model<SignedPaymentVoucher>;
    projectModel = connection.model(
      Project.name,
      ProjectSchema,
    ) as Model<Project>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    documentModel = connection.model(
      StoredDocument.name,
      StoredDocumentSchema,
    ) as Model<StoredDocument>;
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
      documentModel.syncIndexes(),
      counterModel.syncIndexes(),
      idempotencyModel.syncIndexes(),
    ]);

    cashAccountsService = {
      getById: jest.fn(),
      assertSufficientBalance: jest.fn(),
    };
    documentsService = {
      requireActiveDocument: jest.fn(),
      createActiveFromBuffer: jest.fn(),
    };
    journalService = { create: jest.fn(), reverse: jest.fn() };
    financialYearService = { assertPostingAllowed: jest.fn() };

    service = new SignedPaymentVouchersService(
      voucherModel,
      projectModel,
      accountModel,
      cashAccountsService as unknown as CashAccountsService,
      documentsService as unknown as DocumentsService,
      journalService as unknown as JournalService,
      new NumberingService(counterModel),
      financialYearService as unknown as FinancialYearService,
      new SignedPaymentVoucherPdfService(),
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
    await documentModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});
    await connection.model(IdempotencyKey.name).deleteMany({});

    const project = await projectModel.create({
      projectCode: 'PRJ-2026-0099',
      projectName: 'Signature Site',
      projectType: ProjectType.Residential,
      address: {
        line1: 'Site',
        line2: null,
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      status: ProjectStatus.Construction,
      companyId: new Types.ObjectId(),
    });
    projectId = String(project._id);

    const expense = await accountModel.create({
      accountCode: '5200',
      accountName: 'Labour Wages',
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

    cashAccountsService.getById.mockResolvedValue({
      data: {
        id: pettyCashAccountId,
        kind: CashAccountKind.PettyCash,
        projectId,
        status: CashAccountStatus.Active,
        ledgerAccountId: pettyLedgerId,
      },
    });
    cashAccountsService.assertSufficientBalance.mockResolvedValue({});
    financialYearService.assertPostingAllowed.mockResolvedValue({});
    journalService.create.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    journalService.reverse.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });
    documentsService.createActiveFromBuffer.mockResolvedValue({
      data: {
        id: new Types.ObjectId().toHexString(),
        checksum: 'a'.repeat(64),
      },
    });
  });

  async function createLabourDraft(
    overrides: Record<string, unknown> = {},
  ) {
    return service.create(
      {
        voucherType: SignedPaymentVoucherType.Labour,
        projectId,
        pettyCashAccountId,
        recipientName: 'Ravi Kumar',
        recipientMobile: '9876543210',
        workDescription: 'Masonry Block A',
        grossAmount: 5_000,
        deductions: 200,
        requiresWitnessSignature: true,
        requiresRecipientPhoto: true,
        latitude: 13.08,
        longitude: 80.27,
        capturedAt: '2026-07-17T10:30:00.000Z',
        deviceId: 'device-abc',
        ...overrides,
      },
      actorId,
    );
  }

  async function attachAllSignatures(voucherId: string) {
    const makeDoc = async (
      type: string,
      checksum: string,
    ) => {
      const id = new Types.ObjectId();
      documentsService.requireActiveDocument.mockImplementationOnce(
        async () =>
          ({
            _id: id,
            entityId: new Types.ObjectId(voucherId),
            module: 'signed_payment_vouchers',
            documentType: type,
            checksum,
            status: DocumentStatus.Active,
          }) as never,
      );
      return String(id);
    };

    const recipientSig = await makeDoc('recipient_signature', 'r'.repeat(64));
    const engineerSig = await makeDoc('engineer_signature', 'e'.repeat(64));
    const witnessSig = await makeDoc('witness_signature', 'w'.repeat(64));
    const photo = await makeDoc('recipient_photo', 'p'.repeat(64));

    return service.attachSignatures(
      voucherId,
      {
        recipientSignatureDocumentId: recipientSig,
        engineerSignatureDocumentId: engineerSig,
        witnessSignatureDocumentId: witnessSig,
        recipientPhotoDocumentId: photo,
      },
      actorId,
    );
  }

  it('creates labour voucher with net amount', async () => {
    const res = await createLabourDraft();
    expect(res.data?.voucherNumber).toMatch(/^PV-\d{4}-\d{6}$/);
    expect(res.data?.netAmount).toBe(4_800);
    expect(res.data?.status).toBe(SignedPaymentVoucherStatus.Draft);
    expect(res.data?.requiresWitnessSignature).toBe(true);
  });

  it('stores signature checksums from S3 documents', async () => {
    const created = await createLabourDraft();
    const attached = await attachAllSignatures(created.data!.id);
    expect(attached.data?.recipientSignatureChecksum).toBe('r'.repeat(64));
    expect(attached.data?.engineerSignatureChecksum).toBe('e'.repeat(64));
    expect(attached.data?.witnessSignatureChecksum).toBe('w'.repeat(64));
    expect(attached.data?.recipientPhotoChecksum).toBe('p'.repeat(64));
  });

  it('requires witness and photo when configured', async () => {
    const created = await createLabourDraft();
    const id = created.data!.id;

    await voucherModel.updateOne(
      { _id: id },
      {
        $set: {
          recipientSignatureDocumentId: new Types.ObjectId(),
          recipientSignatureChecksum: 'r'.repeat(64),
          engineerSignatureDocumentId: new Types.ObjectId(),
          engineerSignatureChecksum: 'e'.repeat(64),
        },
      },
    );

    await expect(service.submit(id, actorId)).rejects.toThrow(
      /Witness signature is required/,
    );
  });

  it('blocks signature replacement after approval', async () => {
    const created = await createLabourDraft();
    const id = created.data!.id;
    await attachAllSignatures(id);
    await service.submit(id, actorId);
    await service.approve(id, approverId);

    await expect(
      service.attachSignatures(
        id,
        {
          recipientSignatureDocumentId: new Types.ObjectId().toHexString(),
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generates PDF to S3 on approve', async () => {
    const created = await createLabourDraft();
    const id = created.data!.id;
    await attachAllSignatures(id);
    await service.submit(id, actorId);
    const approved = await service.approve(id, approverId);

    expect(approved.data?.status).toBe(SignedPaymentVoucherStatus.Approved);
    expect(approved.data?.voucherPdfDocumentId).toBeTruthy();
    expect(approved.data?.voucherPdfChecksum).toBe('a'.repeat(64));
    expect(documentsService.createActiveFromBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'signed_payment_vouchers',
        documentType: 'voucher_pdf',
        mimeType: 'application/pdf',
        entityId: id,
      }),
      expect.any(Buffer),
      approverId,
    );
  });

  it('posts Dr expense / Cr petty cash for net amount', async () => {
    const created = await createLabourDraft();
    const id = created.data!.id;
    await attachAllSignatures(id);
    await service.submit(id, actorId);
    await service.approve(id, approverId);
    const posted = await service.post(id, posterId);

    expect(posted.data?.status).toBe(SignedPaymentVoucherStatus.Posted);
    expect(journalService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceModule: 'signed_payment',
        lines: [
          expect.objectContaining({
            accountId: expenseLedgerId,
            debit: 4_800,
          }),
          expect.objectContaining({
            accountId: pettyLedgerId,
            credit: 4_800,
          }),
        ],
        post: true,
      }),
      posterId,
      expect.any(String),
    );
  });

  it('reverses posted voucher and creates replacement draft', async () => {
    const created = await createLabourDraft();
    const id = created.data!.id;
    await attachAllSignatures(id);
    await service.submit(id, actorId);
    await service.approve(id, approverId);
    await service.post(id, posterId);

    const result = await service.reverse(
      id,
      { reason: 'Wrong amount', createReplacement: true },
      approverId,
    );

    expect(result.data?.reversed.status).toBe(
      SignedPaymentVoucherStatus.Reversed,
    );
    expect(result.data?.replacement?.status).toBe(
      SignedPaymentVoucherStatus.Draft,
    );
    expect(result.data?.replacement?.replacesVoucherId).toBe(id);
    expect(result.data?.replacement?.recipientSignatureDocumentId).toBeNull();
    expect(journalService.reverse).toHaveBeenCalled();
  });

  it('blocks submitter from approving', async () => {
    const created = await createLabourDraft();
    const id = created.data!.id;
    await attachAllSignatures(id);
    await service.submit(id, actorId);
    await expect(service.approve(id, actorId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
