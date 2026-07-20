import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  BankAccountStatus,
  BankAccountType,
  CompanyBankAccount,
  CompanyBankAccountSchema,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import type { JournalService } from '../journal/journal.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  Vendor,
  VendorSchema,
  VendorStatus,
  VendorVerificationStatus,
} from '../vendors/schemas/vendor.schema';
import {
  VendorInvoice,
  VendorInvoiceMatchingStatus,
  VendorInvoiceSchema,
  VendorInvoiceStatus,
} from '../vendor-invoices/schemas/vendor-invoice.schema';
import { VendorInvoicesService } from '../vendor-invoices/vendor-invoices.service';
import {
  VendorPayment,
  VendorPaymentMode,
  VendorPaymentSchema,
  VendorPaymentStatus,
} from './schemas/vendor-payment.schema';
import { VendorPaymentsService } from './vendor-payments.service';

describe('VendorPaymentsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: VendorPaymentsService;
  let paymentModel: Model<VendorPayment>;
  let invoiceModel: Model<VendorInvoice>;
  let vendorModel: Model<Vendor>;
  let bankModel: Model<CompanyBankAccount>;
  let accountModel: Model<Account>;
  let journalCreate: jest.Mock;

  let actorId: string;
  let vendorId: string;
  let projectId: string;
  let bankAccountId: string;
  let bankLedgerId: string;
  let invoiceAId: string;
  let invoiceBId: string;

  async function seedPayableInvoice(input: {
    documentNumber: string;
    invoiceNumber: string;
    totalAmount: number;
    tds?: number;
    retention?: number;
    paidAmount?: number;
  }) {
    const [invoice] = await invoiceModel.create([
      {
        documentNumber: input.documentNumber,
        invoiceNumber: input.invoiceNumber,
        vendorId: new Types.ObjectId(vendorId),
        projectId: new Types.ObjectId(projectId),
        purchaseOrderId: new Types.ObjectId(),
        grnIds: [],
        invoiceDate: new Date('2026-07-01'),
        dueDate: new Date('2026-07-31'),
        taxableValue: input.totalAmount,
        gst: 0,
        tds: input.tds ?? 0,
        retention: input.retention ?? 0,
        freight: 0,
        discount: 0,
        totalAmount: input.totalAmount,
        paidAmount: input.paidAmount ?? 0,
        items: [],
        variances: [],
        matchingStatus: VendorInvoiceMatchingStatus.Matched,
        exceptionApproved: false,
        status: VendorInvoiceStatus.Posted,
      },
    ]);
    return String(invoice._id);
  }

  async function runToVerified(paymentId: string) {
    await service.submit(paymentId, actorId);
    await service.approve(paymentId, actorId);
    await service.release(paymentId, actorId);
    return service.verify(paymentId, actorId);
  }

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    paymentModel = connection.model(
      VendorPayment.name,
      VendorPaymentSchema,
    ) as Model<VendorPayment>;
    invoiceModel = connection.model(
      VendorInvoice.name,
      VendorInvoiceSchema,
    ) as Model<VendorInvoice>;
    vendorModel = connection.model(Vendor.name, VendorSchema) as Model<Vendor>;
    bankModel = connection.model(
      CompanyBankAccount.name,
      CompanyBankAccountSchema,
    ) as Model<CompanyBankAccount>;
    accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      paymentModel.syncIndexes(),
      invoiceModel.syncIndexes(),
      vendorModel.syncIndexes(),
      bankModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    journalCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });

    const configService = {
      get: jest.fn().mockReturnValue(0),
    } as unknown as ConfigService<never, true>;

    const vendorInvoicesService = new VendorInvoicesService(
      invoiceModel,
      {} as never,
      {} as never,
      {} as never,
      vendorModel,
      accountModel,
      new NumberingService(counterModel),
      { create: journalCreate } as unknown as JournalService,
      configService,
    );

    service = new VendorPaymentsService(
      paymentModel,
      invoiceModel,
      vendorModel,
      bankModel,
      accountModel,
      vendorInvoicesService,
      new NumberingService(counterModel),
      { create: journalCreate } as unknown as JournalService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId().toHexString();
    bankLedgerId = new Types.ObjectId().toHexString();
    journalCreate.mockClear();
    journalCreate.mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });

    await paymentModel.deleteMany({}).setOptions({ withDeleted: true });
    await invoiceModel.deleteMany({}).setOptions({ withDeleted: true });
    await vendorModel.deleteMany({}).setOptions({ withDeleted: true });
    await bankModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [vendor] = await vendorModel.create([
      {
        vendorCode: 'VEN-PAY-001',
        legalName: 'Payment Vendor',
        status: VendorStatus.Active,
        verificationStatus: VendorVerificationStatus.Verified,
        materialCategories: ['cement'],
      },
    ]);
    vendorId = String(vendor._id);

    const [bank] = await bankModel.create([
      {
        accountCode: 'BA-VP-001',
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
      },
    ]);
    bankAccountId = String(bank._id);

    await accountModel.create([
      {
        accountCode: '2100',
        accountName: 'Vendor Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.VendorPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2200',
        accountName: 'TDS Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.TdsPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2300',
        accountName: 'Retention Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.RetentionPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '4100',
        accountName: 'Other Income',
        accountType: AccountType.Income,
        accountCategory: AccountCategory.OtherIncome,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);

    invoiceAId = await seedPayableInvoice({
      documentNumber: 'VI-2026-000001',
      invoiceNumber: 'INV-A',
      totalAmount: 1000,
      tds: 0,
      retention: 0,
    });
    invoiceBId = await seedPayableInvoice({
      documentNumber: 'VI-2026-000002',
      invoiceNumber: 'INV-B',
      totalAmount: 500,
      tds: 0,
      retention: 0,
    });
  });

  it('requires transactionReference', async () => {
    await expect(
      service.create(
        {
          vendorId,
          projectId,
          allocations: [{ invoiceId: invoiceAId, amount: 100 }],
          paymentDate: '2026-07-17',
          amount: 100,
          paymentMode: VendorPaymentMode.Neft,
          bankAccountId,
          transactionReference: '',
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks payment exceeding approved payable', async () => {
    await expect(
      service.create(
        {
          vendorId,
          projectId,
          allocations: [{ invoiceId: invoiceAId, amount: 1001 }],
          paymentDate: '2026-07-17',
          amount: 1001,
          paymentMode: VendorPaymentMode.Neft,
          bankAccountId,
          transactionReference: 'UTR-OVER-1',
        },
        actorId,
      ),
    ).rejects.toThrow(/exceeds available payable/);
  });

  it('allocates across invoices and supports partial payments', async () => {
    const created = await service.create(
      {
        vendorId,
        projectId,
        allocations: [
          { invoiceId: invoiceAId, amount: 400 },
          { invoiceId: invoiceBId, amount: 200 },
        ],
        paymentDate: '2026-07-17',
        amount: 600,
        paymentMode: VendorPaymentMode.Rtgs,
        bankAccountId,
        transactionReference: 'UTR-PARTIAL-1',
        tds: 50,
        retention: 25,
        deductions: 25,
      },
      actorId,
    );

    expect(created.data!.paymentNumber).toMatch(/^VP-/);
    expect(created.data!.status).toBe(VendorPaymentStatus.Draft);
    expect(created.data!.invoiceIds).toHaveLength(2);
    expect(created.data!.bankAmount).toBe(500);

    await runToVerified(created.data!.id);
    const posted = await service.post(created.data!.id, actorId);

    expect(posted.data!.status).toBe(VendorPaymentStatus.Posted);
    expect(journalCreate).toHaveBeenCalled();
    const journalArgs = journalCreate.mock.calls[0]![0];
    expect(journalArgs.lines[0].debit).toBe(600);
    expect(journalArgs.lines.some((l: { credit: number }) => l.credit === 500))
      .toBe(true);

    const invA = await invoiceModel.findById(invoiceAId).exec();
    const invB = await invoiceModel.findById(invoiceBId).exec();
    expect(invA!.paidAmount).toBe(400);
    expect(invA!.status).toBe(VendorInvoiceStatus.Posted);
    expect(invB!.paidAmount).toBe(200);
    expect(invB!.status).toBe(VendorInvoiceStatus.Posted);

    const remainder = await service.create(
      {
        vendorId,
        projectId,
        allocations: [{ invoiceId: invoiceAId, amount: 600 }],
        paymentDate: '2026-07-18',
        amount: 600,
        paymentMode: VendorPaymentMode.Neft,
        bankAccountId,
        transactionReference: 'UTR-PARTIAL-2',
      },
      actorId,
    );
    await runToVerified(remainder.data!.id);
    await service.post(remainder.data!.id, actorId);

    const invAFinal = await invoiceModel.findById(invoiceAId).exec();
    expect(invAFinal!.paidAmount).toBe(1000);
    expect(invAFinal!.status).toBe(VendorInvoiceStatus.Paid);
  });

  it('reserves open payment allocations against remaining payable', async () => {
    await service.create(
      {
        vendorId,
        projectId,
        allocations: [{ invoiceId: invoiceAId, amount: 700 }],
        paymentDate: '2026-07-17',
        amount: 700,
        paymentMode: VendorPaymentMode.Neft,
        bankAccountId,
        transactionReference: 'UTR-RESERVE-1',
      },
      actorId,
    );

    await expect(
      service.create(
        {
          vendorId,
          projectId,
          allocations: [{ invoiceId: invoiceAId, amount: 400 }],
          paymentDate: '2026-07-17',
          amount: 400,
          paymentMode: VendorPaymentMode.Neft,
          bankAccountId,
          transactionReference: 'UTR-RESERVE-2',
        },
        actorId,
      ),
    ).rejects.toThrow(/exceeds available payable/);
  });

  it('follows Draft → Approval → Released → Verified → Posted', async () => {
    const created = await service.create(
      {
        vendorId,
        projectId,
        allocations: [{ invoiceId: invoiceAId, amount: 1000 }],
        paymentDate: '2026-07-17',
        amount: 1000,
        paymentMode: VendorPaymentMode.BankTransfer,
        bankAccountId,
        transactionReference: 'UTR-FLOW-1',
      },
      actorId,
    );

    const submitted = await service.submit(created.data!.id, actorId);
    expect(submitted.data!.status).toBe(VendorPaymentStatus.Approval);

    const approved = await service.approve(created.data!.id, actorId);
    expect(approved.data!.status).toBe(VendorPaymentStatus.Released);

    const released = await service.release(created.data!.id, actorId);
    expect(released.data!.releasedBy).toBe(actorId);

    const verified = await service.verify(created.data!.id, actorId);
    expect(verified.data!.status).toBe(VendorPaymentStatus.Verified);

    const posted = await service.post(created.data!.id, actorId);
    expect(posted.data!.status).toBe(VendorPaymentStatus.Posted);
    expect(posted.data!.journalEntryId).toBeTruthy();
  });
});
