import { BadRequestException } from '@nestjs/common';
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
import { ContractorBillsService } from '../contractor-bills/contractor-bills.service';
import {
  ContractorBill,
  ContractorBillSchema,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorSchema,
  ContractorStatus,
  ContractorType,
  ContractorVerificationStatus,
} from '../contractors/schemas/contractor.schema';
import type { JournalService } from '../journal/journal.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { ContractorPaymentsService } from './contractor-payments.service';
import {
  ContractorPayment,
  ContractorPaymentMode,
  ContractorPaymentSchema,
  ContractorPaymentStatus,
} from './schemas/contractor-payment.schema';

describe('ContractorPaymentsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: ContractorPaymentsService;
  let paymentModel: Model<ContractorPayment>;
  let billModel: Model<ContractorBill>;
  let contractorModel: Model<Contractor>;
  let bankModel: Model<CompanyBankAccount>;
  let accountModel: Model<Account>;
  let journalCreate: jest.Mock;

  let actorId: string;
  let contractorId: string;
  let projectId: string;
  let bankAccountId: string;
  let bankLedgerId: string;
  let billAId: string;
  let billBId: string;
  let contractorPayableId: string;

  async function seedPostedBill(input: {
    billNumber: string;
    raNumber: number;
    netPayable: number;
    paidAmount?: number;
  }) {
    const [bill] = await billModel.create([
      {
        billNumber: input.billNumber,
        raNumber: input.raNumber,
        contractorId: new Types.ObjectId(contractorId),
        projectId: new Types.ObjectId(projectId),
        agreementId: new Types.ObjectId(),
        billingPeriod: {
          from: new Date('2026-07-01T00:00:00.000Z'),
          to: new Date('2026-07-31T00:00:00.000Z'),
        },
        measurements: [],
        previousCertifiedValue: 0,
        currentCertifiedValue: input.netPayable + 1000,
        cumulativeValue: input.netPayable + 1000,
        advanceRecovery: 500,
        materialRecovery: 0,
        retention: 500,
        tds: 0,
        penalty: 0,
        otherDeductions: 0,
        netPayable: input.netPayable,
        paidAmount: input.paidAmount ?? 0,
        invoiceDocument: 'inv-doc',
        status: ContractorBillStatus.Posted,
        postedBy: new Types.ObjectId(actorId),
        postedAt: new Date(),
      },
    ]);
    return String(bill._id);
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
      ContractorPayment.name,
      ContractorPaymentSchema,
    ) as Model<ContractorPayment>;
    billModel = connection.model(
      ContractorBill.name,
      ContractorBillSchema,
    ) as Model<ContractorBill>;
    contractorModel = connection.model(
      Contractor.name,
      ContractorSchema,
    ) as Model<Contractor>;
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
      billModel.syncIndexes(),
      contractorModel.syncIndexes(),
      bankModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    journalCreate = jest.fn().mockResolvedValue({
      data: { id: new Types.ObjectId().toHexString() },
    });

    const billsService = new ContractorBillsService(
      billModel,
      {} as never,
      {} as never,
      {} as never,
      contractorModel,
      new NumberingService(counterModel),
    );

    service = new ContractorPaymentsService(
      paymentModel,
      billModel,
      contractorModel,
      bankModel,
      accountModel,
      billsService,
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
    await billModel.deleteMany({}).setOptions({ withDeleted: true });
    await contractorModel.deleteMany({}).setOptions({ withDeleted: true });
    await bankModel.deleteMany({}).setOptions({ withDeleted: true });
    await accountModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [contractor] = await contractorModel.create([
      {
        contractorCode: 'CON-000401',
        legalName: 'Payment Contractor',
        contractorType: ContractorType.Civil,
        status: ContractorStatus.Active,
        verificationStatus: ContractorVerificationStatus.Verified,
        workCategories: [],
        contact: {},
        bankDetails: {},
        labourLicence: {},
      },
    ]);
    contractorId = String(contractor._id);

    const [bank] = await bankModel.create([
      {
        accountCode: 'BA-CP-001',
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

    const [contractorPayable] = await accountModel.create([
      {
        accountCode: '2120',
        accountName: 'Contractor Payable',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.ContractorPayable,
        parentAccountId: null,
        level: 2,
        isControlAccount: false,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2160',
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
        accountCode: '2170',
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
    contractorPayableId = String(contractorPayable._id);

    billAId = await seedPostedBill({
      billNumber: 'CB-2026-000001',
      raNumber: 1,
      netPayable: 7000,
    });
    billBId = await seedPostedBill({
      billNumber: 'CB-2026-000002',
      raNumber: 2,
      netPayable: 3000,
    });
  });

  it('supports multi-bill allocation, partial pay, withholdings, and journal post', async () => {
    const created = await service.create(
      {
        contractorId,
        projectId,
        allocations: [
          { billId: billAId, amount: 4000 },
          { billId: billBId, amount: 3000 },
        ],
        paymentDate: '2026-07-20',
        amount: 7000,
        paymentMode: ContractorPaymentMode.Neft,
        bankAccountId,
        transactionReference: 'UTR-CP-001',
        tds: 200,
        retention: 300,
        advanceRecovery: 500,
        penalty: 100,
        paymentProof: 'proof-doc-1',
      },
      actorId,
    );

    expect(created.data!.paymentNumber).toMatch(/^CP-/);
    expect(created.data!.bankAmount).toBe(5900);
    expect(created.data!.status).toBe(ContractorPaymentStatus.Draft);

    await runToVerified(created.data!.id);
    const posted = await service.post(created.data!.id, actorId);

    expect(posted.data!.status).toBe(ContractorPaymentStatus.Posted);
    expect(posted.data!.journalEntryId).toBeTruthy();
    expect(journalCreate).toHaveBeenCalled();

    const journalDto = journalCreate.mock.calls[0][0];
    const debitLine = journalDto.lines.find(
      (line: { accountId: string; debit: number }) =>
        line.accountId === contractorPayableId && line.debit === 7000,
    );
    const bankCredit = journalDto.lines.find(
      (line: { accountId: string; credit: number }) =>
        line.accountId === bankLedgerId && line.credit === 5900,
    );
    expect(debitLine).toBeTruthy();
    expect(bankCredit).toBeTruthy();

    const billA = await billModel.findById(billAId).lean().exec();
    const billB = await billModel.findById(billBId).lean().exec();
    expect(billA!.paidAmount).toBe(4000);
    expect(billA!.status).toBe(ContractorBillStatus.Posted);
    expect(billB!.paidAmount).toBe(3000);
    expect(billB!.status).toBe(ContractorBillStatus.Paid);
  });

  it('rejects over-allocation against remaining payable', async () => {
    await expect(
      service.create(
        {
          contractorId,
          projectId,
          allocations: [{ billId: billAId, amount: 8000 }],
          paymentDate: '2026-07-20',
          amount: 8000,
          paymentMode: ContractorPaymentMode.Neft,
          bankAccountId,
          transactionReference: 'UTR-CP-002',
          paymentProof: 'proof-2',
        },
        actorId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires paymentProof before bank release', async () => {
    const created = await service.create(
      {
        contractorId,
        projectId,
        allocations: [{ billId: billAId, amount: 1000 }],
        paymentDate: '2026-07-20',
        amount: 1000,
        paymentMode: ContractorPaymentMode.Neft,
        bankAccountId,
        transactionReference: 'UTR-CP-003',
      },
      actorId,
    );

    await service.submit(created.data!.id, actorId);
    await service.approve(created.data!.id, actorId);
    await expect(service.release(created.data!.id, actorId)).rejects.toThrow(
      /paymentProof/,
    );
  });

  it('settles remaining payable on a second partial payment', async () => {
    const first = await service.create(
      {
        contractorId,
        projectId,
        allocations: [{ billId: billAId, amount: 2500 }],
        paymentDate: '2026-07-20',
        amount: 2500,
        paymentMode: ContractorPaymentMode.Neft,
        bankAccountId,
        transactionReference: 'UTR-CP-004',
        paymentProof: 'proof-4',
      },
      actorId,
    );
    await runToVerified(first.data!.id);
    await service.post(first.data!.id, actorId);

    const second = await service.create(
      {
        contractorId,
        projectId,
        allocations: [{ billId: billAId, amount: 4500 }],
        paymentDate: '2026-07-21',
        amount: 4500,
        paymentMode: ContractorPaymentMode.Neft,
        bankAccountId,
        transactionReference: 'UTR-CP-005',
        paymentProof: 'proof-5',
      },
      actorId,
    );
    await runToVerified(second.data!.id);
    await service.post(second.data!.id, actorId);

    const billA = await billModel.findById(billAId).lean().exec();
    expect(billA!.paidAmount).toBe(7000);
    expect(billA!.status).toBe(ContractorBillStatus.Paid);
  });
});
