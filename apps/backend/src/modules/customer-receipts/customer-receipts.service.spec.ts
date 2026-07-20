import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
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
import {
  Booking,
  BookingSchema,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
import {
  Customer,
  CustomerFundingType,
  CustomerSchema,
  CustomerStatus,
} from '../customers/schemas/customer.schema';
import { JournalService } from '../journal/journal.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import {
  PaymentDemand,
  PaymentDemandSchema,
  PaymentDemandStatus,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
  PaymentScheduleSchema,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { CustomerReceiptPdfService } from './customer-receipt-pdf.service';
import { CustomerReceiptsService } from './customer-receipts.service';
import {
  CustomerReceipt,
  CustomerReceiptPaymentMode,
  CustomerReceiptSchema,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from './schemas/customer-receipt.schema';

describe('CustomerReceiptsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: CustomerReceiptsService;
  let receiptModel: Model<CustomerReceipt>;
  let demandModel: Model<PaymentDemand>;
  let scheduleModel: Model<PaymentSchedule>;

  let actorId: string;
  let customerId: string;
  let bookingId: string;
  let projectId: Types.ObjectId;
  let unitId: Types.ObjectId;
  let bankAccountId: string;
  let demandId: string;
  let lineId: Types.ObjectId;
  let journalCalls: number;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    receiptModel = connection.model(
      CustomerReceipt.name,
      CustomerReceiptSchema,
    ) as Model<CustomerReceipt>;
    demandModel = connection.model(
      PaymentDemand.name,
      PaymentDemandSchema,
    ) as Model<PaymentDemand>;
    scheduleModel = connection.model(
      PaymentSchedule.name,
      PaymentScheduleSchema,
    ) as Model<PaymentSchedule>;
    const bookingModel = connection.model(
      Booking.name,
      BookingSchema,
    ) as Model<Booking>;
    const customerModel = connection.model(
      Customer.name,
      CustomerSchema,
    ) as Model<Customer>;
    const bankModel = connection.model(
      CompanyBankAccount.name,
      CompanyBankAccountSchema,
    ) as Model<CompanyBankAccount>;
    const accountModel = connection.model(
      Account.name,
      AccountSchema,
    ) as Model<Account>;
    const counterModel = connection.model(
      Counter.name,
      CounterSchema,
    ) as Model<Counter>;

    await Promise.all([
      receiptModel.syncIndexes(),
      demandModel.syncIndexes(),
      scheduleModel.syncIndexes(),
      bookingModel.syncIndexes(),
      customerModel.syncIndexes(),
      bankModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    journalCalls = 0;
    const journalService = {
      create: async () => {
        journalCalls += 1;
        return { data: { id: new Types.ObjectId().toHexString() } };
      },
    } as unknown as JournalService;

    service = new CustomerReceiptsService(
      receiptModel,
      bookingModel,
      customerModel,
      demandModel,
      scheduleModel,
      bankModel,
      accountModel,
      new NumberingService(counterModel),
      journalService,
      new CustomerReceiptPdfService(),
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    projectId = new Types.ObjectId();
    unitId = new Types.ObjectId();
    lineId = new Types.ObjectId();
    journalCalls = 0;

    await receiptModel.deleteMany({}).setOptions({ withDeleted: true });
    await demandModel.deleteMany({}).setOptions({ withDeleted: true });
    await scheduleModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(Booking.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Customer.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(CompanyBankAccount.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Account.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [customer] = await connection.model(Customer.name).create([
      {
        customerCode: 'CUS-000001',
        fullName: 'Ravi Kumar',
        fundingType: CustomerFundingType.OwnFunds,
        status: CustomerStatus.Active,
        contact: {},
        address: {},
        jointApplicant: {},
      },
    ]);
    customerId = String(customer._id);

    const [booking] = await connection.model(Booking.name).create([
      {
        bookingNumber: 'BK-2026-000001',
        customerId: customer._id,
        projectId,
        unitId,
        bookingDate: new Date('2026-07-01'),
        bookingAmount: 200_000,
        agreedPrice: 8_000_000,
        discount: 0,
        approvedPrice: 8_000_000,
        fundingType: CustomerFundingType.OwnFunds,
        status: BookingStatus.Booked,
        paymentPlan: { name: null, installments: [] },
        broker: {},
      },
    ]);
    bookingId = String(booking._id);

    const [bankLedger] = await connection.model(Account.name).create([
      {
        accountCode: '1110-01',
        accountName: 'HDFC Current',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Bank,
        level: 2,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '2140',
        accountName: 'Customer Advance',
        accountType: AccountType.Liability,
        accountCategory: AccountCategory.CustomerAdvance,
        level: 1,
        allowManualPosting: true,
        requiresProject: true,
        requiresParty: true,
        status: AccountStatus.Active,
      },
      {
        accountCode: '1120',
        accountName: 'Cash',
        accountType: AccountType.Asset,
        accountCategory: AccountCategory.Cash,
        level: 1,
        allowManualPosting: true,
        status: AccountStatus.Active,
      },
    ]);

    const [bank] = await connection.model(CompanyBankAccount.name).create([
      {
        accountCode: 'BA-COLLECT-01',
        bankName: 'HDFC Bank',
        branch: 'Chennai',
        accountHolderName: 'Luxaria Developers Pvt Ltd',
        maskedAccountNumber: 'XXXXXX7890',
        encryptedAccountNumber: 'enc:v1:test',
        ifsc: 'HDFC0001234',
        accountType: BankAccountType.Current,
        ledgerAccountId: bankLedger._id,
        openingBalance: 0,
        status: BankAccountStatus.Active,
        projectId: null,
      },
    ]);
    bankAccountId = String(bank._id);

    const [schedule] = await scheduleModel.create([
      {
        scheduleNumber: 'PS-2026-000001',
        bookingId: booking._id,
        projectId,
        customerId: customer._id,
        unitId,
        scheduleType: PaymentScheduleType.DateBased,
        totalAmount: 8_000_000,
        lines: [
          {
            _id: lineId,
            sequence: 1,
            milestone: 'On booking',
            dueDate: new Date('2026-08-01'),
            percentage: 20,
            amount: 1_600_000,
            tax: 0,
            collectedAmount: 0,
            status: PaymentScheduleLineStatus.Demanded,
            demandId: null,
            markedDueAt: null,
            overdueAt: null,
          },
        ],
        status: PaymentScheduleStatus.Active,
        revisionNumber: 1,
      },
    ]);

    const [demand] = await demandModel.create([
      {
        demandNumber: 'DM-2026-000001',
        scheduleId: schedule._id,
        lineId,
        bookingId: booking._id,
        projectId,
        customerId: customer._id,
        milestone: 'On booking',
        dueDate: new Date('2026-08-01'),
        amount: 1_600_000,
        tax: 0,
        totalAmount: 1_600_000,
        collectedAmount: 0,
        status: PaymentDemandStatus.Issued,
        issuedAt: new Date(),
        issuedBy: new Types.ObjectId(actorId),
      },
    ]);
    demandId = String(demand._id);

    await scheduleModel.updateOne(
      { _id: schedule._id, 'lines._id': lineId },
      { $set: { 'lines.$.demandId': demand._id } },
    );
  });

  it('creates CR receipt with unallocated advance and allocations', async () => {
    const created = await service.create(
      {
        customerId,
        bookingId,
        amount: 500_000,
        paymentMode: CustomerReceiptPaymentMode.Neft,
        companyBankAccountId: bankAccountId,
        transactionReference: 'UTR-CR-001',
        sourceType: CustomerReceiptSourceType.OwnFund,
        scheduleAllocation: [{ demandId, amount: 300_000 }],
      },
      actorId,
    );

    expect(created.data!.receiptNumber).toMatch(/^CR-/);
    expect(created.data!.allocatedAmount).toBe(300_000);
    expect(created.data!.unallocatedAmount).toBe(200_000);
    expect(created.data!.status).toBe(CustomerReceiptStatus.Draft);
    expect(created.data!.unitId).toBe(String(unitId));
  });

  it('prevents duplicate transaction references on the same bank account', async () => {
    await service.create(
      {
        customerId,
        bookingId,
        amount: 100_000,
        paymentMode: CustomerReceiptPaymentMode.Neft,
        companyBankAccountId: bankAccountId,
        transactionReference: 'UTR-DUP-1',
        sourceType: CustomerReceiptSourceType.OwnFund,
      },
      actorId,
    );

    await expect(
      service.create(
        {
          customerId,
          bookingId,
          amount: 50_000,
          paymentMode: CustomerReceiptPaymentMode.Neft,
          companyBankAccountId: bankAccountId,
          transactionReference: 'UTR-DUP-1',
          sourceType: CustomerReceiptSourceType.OwnFund,
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('posts receipt: allocates demand, journals, and generates PDF', async () => {
    const created = await service.create(
      {
        customerId,
        bookingId,
        amount: 1_600_000,
        paymentMode: CustomerReceiptPaymentMode.Neft,
        companyBankAccountId: bankAccountId,
        transactionReference: 'UTR-POST-1',
        sourceType: CustomerReceiptSourceType.BankLoan,
        loanBank: 'SBI',
        scheduleAllocation: [{ demandId, amount: 1_600_000 }],
        post: true,
      },
      actorId,
    );

    expect(created.data!.status).toBe(CustomerReceiptStatus.Posted);
    expect(created.data!.journalEntryId).toBeTruthy();
    expect(created.data!.receiptPdfPath).toMatch(/^uploads\/customer-receipts\//);
    expect(created.data!.receiptDocument).toBe(created.data!.receiptPdfPath);
    expect(journalCalls).toBe(1);

    const demand = await demandModel.findById(demandId).lean();
    expect(demand?.collectedAmount).toBe(1_600_000);
    expect(demand?.status).toBe(PaymentDemandStatus.Settled);

    const schedule = await scheduleModel
      .findById(demand!.scheduleId)
      .lean();
    const line = schedule?.lines.find((l) => String(l._id) === String(lineId));
    expect(line).toBeTruthy();
    expect(line?.collectedAmount).toBe(1_600_000);
    expect(line?.status).toBe(PaymentScheduleLineStatus.Paid);

    const absolute = join(process.cwd(), created.data!.receiptPdfPath!);
    expect(existsSync(absolute)).toBe(true);
    unlinkSync(absolute);
  });

  it('rejects allocation above demand remaining balance', async () => {
    await expect(
      service.create(
        {
          customerId,
          bookingId,
          amount: 2_000_000,
          paymentMode: CustomerReceiptPaymentMode.Neft,
          companyBankAccountId: bankAccountId,
          transactionReference: 'UTR-OVER',
          sourceType: CustomerReceiptSourceType.OwnFund,
          scheduleAllocation: [{ demandId, amount: 2_000_000 }],
        },
        actorId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('supports fully unallocated advance receipts', async () => {
    const created = await service.create(
      {
        customerId,
        bookingId,
        amount: 250_000,
        paymentMode: CustomerReceiptPaymentMode.Cash,
        sourceType: CustomerReceiptSourceType.OwnFund,
        scheduleAllocation: [],
        post: true,
      },
      actorId,
    );

    expect(created.data!.allocatedAmount).toBe(0);
    expect(created.data!.unallocatedAmount).toBe(250_000);
    expect(created.data!.status).toBe(CustomerReceiptStatus.Posted);
    expect(journalCalls).toBe(1);
  });
});
