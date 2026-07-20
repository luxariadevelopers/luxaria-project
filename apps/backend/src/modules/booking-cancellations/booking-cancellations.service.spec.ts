import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection, Model } from 'mongoose';
import { Types, connect, disconnect } from 'mongoose';
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import { BookingsService } from '../bookings/bookings.service';
import {
  Booking,
  BookingSchema,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
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
import { CustomerFundingType } from '../customers/schemas/customer.schema';
import {
  CustomerReceipt,
  CustomerReceiptPaymentMode,
  CustomerReceiptSchema,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import { JournalService } from '../journal/journal.service';
import { NumberingService } from '../numbering/numbering.service';
import { Counter, CounterSchema } from '../numbering/schemas/counter.schema';
import { BookingCancellationsService } from './booking-cancellations.service';
import {
  BookingCancellation,
  BookingCancellationSchema,
  BookingCancellationStatus,
} from './schemas/booking-cancellation.schema';

describe('BookingCancellationsService', () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let service: BookingCancellationsService;
  let cancellationModel: Model<BookingCancellation>;
  let bookingModel: Model<Booking>;
  let receiptModel: Model<CustomerReceipt>;

  let actorId: string;
  let bookingId: string;
  let customerId: Types.ObjectId;
  let projectId: Types.ObjectId;
  let unitId: Types.ObjectId;
  let bankAccountId: string;
  let finalizeCalls: string[];
  let journalCalls: number;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoose = await connect(mongoServer.getUri());
    connection = mongoose.connection;

    cancellationModel = connection.model(
      BookingCancellation.name,
      BookingCancellationSchema,
    ) as Model<BookingCancellation>;
    bookingModel = connection.model(
      Booking.name,
      BookingSchema,
    ) as Model<Booking>;
    receiptModel = connection.model(
      CustomerReceipt.name,
      CustomerReceiptSchema,
    ) as Model<CustomerReceipt>;
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
      cancellationModel.syncIndexes(),
      bookingModel.syncIndexes(),
      receiptModel.syncIndexes(),
      bankModel.syncIndexes(),
      accountModel.syncIndexes(),
      counterModel.syncIndexes(),
    ]);

    finalizeCalls = [];
    journalCalls = 0;

    const bookingsService = {
      finalizeCancellation: async (id: string) => {
        finalizeCalls.push(id);
        await bookingModel.findByIdAndUpdate(id, {
          status: BookingStatus.Cancelled,
          cancelledAt: new Date(),
        });
        return { success: true, data: { id, status: BookingStatus.Cancelled } };
      },
    } as unknown as BookingsService;

    const approvalsService = {
      create: async () => ({
        data: { id: new Types.ObjectId().toHexString(), status: 'pending' },
      }),
      approve: async () => ({
        data: { status: ApprovalStatus.Approved },
      }),
      reject: async () => ({
        data: { status: ApprovalStatus.Rejected },
      }),
    } as unknown as ApprovalsService;

    const journalService = {
      create: async () => {
        journalCalls += 1;
        return { data: { id: new Types.ObjectId().toHexString() } };
      },
    } as unknown as JournalService;

    service = new BookingCancellationsService(
      cancellationModel,
      bookingModel,
      receiptModel,
      bankModel,
      accountModel,
      new NumberingService(counterModel),
      bookingsService,
      approvalsService,
      journalService,
    );
  }, 120_000);

  afterAll(async () => {
    await disconnect().catch(() => undefined);
    if (mongoServer) await mongoServer.stop();
  });

  beforeEach(async () => {
    actorId = new Types.ObjectId().toHexString();
    customerId = new Types.ObjectId();
    projectId = new Types.ObjectId();
    unitId = new Types.ObjectId();
    finalizeCalls = [];
    journalCalls = 0;

    await cancellationModel.deleteMany({}).setOptions({ withDeleted: true });
    await bookingModel.deleteMany({}).setOptions({ withDeleted: true });
    await receiptModel.deleteMany({}).setOptions({ withDeleted: true });
    await connection
      .model(CompanyBankAccount.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection
      .model(Account.name)
      .deleteMany({})
      .setOptions({ withDeleted: true });
    await connection.model(Counter.name).deleteMany({});

    const [booking] = await bookingModel.create([
      {
        bookingNumber: 'BK-2026-000010',
        customerId,
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

    await receiptModel.create({
      receiptNumber: 'CR-2026-000010',
      customerId,
      bookingId: booking._id,
      unitId,
      projectId,
      receiptDate: new Date('2026-07-05'),
      amount: 500_000,
      paymentMode: CustomerReceiptPaymentMode.Neft,
      companyBankAccountId: new Types.ObjectId(),
      transactionReference: 'UTR-R1',
      sourceType: CustomerReceiptSourceType.OwnFund,
      scheduleAllocation: [],
      allocatedAmount: 0,
      unallocatedAmount: 500_000,
      status: CustomerReceiptStatus.Posted,
    });

    const [bankLedger] = await connection.model(Account.name).create([
      {
        accountCode: '1110-99',
        accountName: 'Refund Bank',
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
        status: AccountStatus.Active,
      },
    ]);

    const [bank] = await connection.model(CompanyBankAccount.name).create([
      {
        accountCode: 'BA-REFUND-01',
        bankName: 'HDFC Bank',
        branch: 'Chennai',
        accountHolderName: 'Luxaria Developers Pvt Ltd',
        maskedAccountNumber: 'XXXXXX1111',
        encryptedAccountNumber: 'enc:v1:test',
        ifsc: 'HDFC0001111',
        accountType: BankAccountType.Current,
        ledgerAccountId: bankLedger._id,
        openingBalance: 0,
        status: BankAccountStatus.Active,
        projectId: null,
      },
    ]);
    bankAccountId = String(bank._id);
  });

  async function runToApproved(charge = 50_000, deductions = 25_000) {
    const requested = await service.request(
      {
        bookingId,
        cancellationReason: 'Customer relocation',
        cancellationCharge: charge,
        deductions,
      },
      actorId,
    );
    await service.review(requested.data!.id, {}, actorId);
    return service.approve(requested.data!.id, { comment: 'OK' }, actorId);
  }

  it('requests cancellation with totalReceived snapshot and approvedRefund', async () => {
    const created = await service.request(
      {
        bookingId,
        cancellationReason: 'Buyer withdrawal',
        cancellationCharge: 50_000,
        deductions: 25_000,
      },
      actorId,
    );

    expect(created.data!.cancellationNumber).toMatch(/^BC-/);
    expect(created.data!.status).toBe(BookingCancellationStatus.Requested);
    expect(created.data!.totalReceived).toBe(500_000);
    expect(created.data!.approvedRefund).toBe(425_000);
    expect(finalizeCalls).toHaveLength(0);
  });

  it('runs Requested → Reviewed → Approved → Refund Processed → Unit Released', async () => {
    const approved = await runToApproved();
    expect(approved.data!.status).toBe(BookingCancellationStatus.Approved);

    // Unit must not be released before refund
    await expect(
      service.releaseUnit(approved.data!.id, actorId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(finalizeCalls).toHaveLength(0);

    const refunded = await service.processRefund(
      approved.data!.id,
      {
        refundBankAccountId: bankAccountId,
        refundTransactionId: 'NEFT-REF-100',
      },
      actorId,
    );
    expect(refunded.data!.status).toBe(
      BookingCancellationStatus.RefundProcessed,
    );
    expect(refunded.data!.journalEntryId).toBeTruthy();
    expect(journalCalls).toBe(1);

    const released = await service.releaseUnit(refunded.data!.id, actorId);
    expect(released.data!.status).toBe(
      BookingCancellationStatus.UnitReleased,
    );
    expect(finalizeCalls).toEqual([bookingId]);

    const booking = await bookingModel.findById(bookingId).lean();
    expect(booking?.status).toBe(BookingStatus.Cancelled);
  });

  it('allows unit release without refund journal when approvedRefund is zero', async () => {
    const approved = await runToApproved(500_000, 0); // charge = full receipt
    expect(approved.data!.approvedRefund).toBe(0);

    const released = await service.releaseUnit(approved.data!.id, actorId);
    expect(released.data!.status).toBe(
      BookingCancellationStatus.UnitReleased,
    );
    expect(journalCalls).toBe(0);
    expect(finalizeCalls).toEqual([bookingId]);
  });

  it('blocks a second open cancellation for the same booking', async () => {
    await service.request(
      { bookingId, cancellationReason: 'First' },
      actorId,
    );
    await expect(
      service.request(
        { bookingId, cancellationReason: 'Second' },
        actorId,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('attaches cancellation documents', async () => {
    const created = await service.request(
      { bookingId, cancellationReason: 'Docs' },
      actorId,
    );
    const withDoc = await service.addDocument(
      created.data!.id,
      {
        fileName: 'cancel-letter.pdf',
        filePath: 'uploads/private/booking-cancellations/x/cancel-letter.pdf',
        category: 'cancellation_letter',
      },
      actorId,
    );
    expect(withDoc.data!.documents).toHaveLength(1);
    expect(withDoc.data!.documents[0]?.fileName).toBe('cancel-letter.pdf');
  });

  it('requires accounting entry when processing a refund', async () => {
    const approved = await runToApproved();
    const refunded = await service.processRefund(
      approved.data!.id,
      {
        refundBankAccountId: bankAccountId,
        refundTransactionId: 'UTR-ACC-1',
      },
      actorId,
    );
    expect(refunded.data!.journalEntryId).toBeTruthy();
    expect(journalCalls).toBe(1);
  });
});
