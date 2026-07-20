import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import {
  BankAccountStatus,
  CompanyBankAccount,
} from '../company-bank-accounts/schemas/company-bank-account.schema';
import {
  Booking,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
import { Customer } from '../customers/schemas/customer.schema';
import { JournalService } from '../journal/journal.service';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import {
  PaymentDemand,
  PaymentDemandStatus,
} from '../payment-schedules/schemas/payment-demand.schema';
import {
  PaymentSchedule,
  PaymentScheduleLineStatus,
} from '../payment-schedules/schemas/payment-schedule.schema';
import { CustomerReceiptPdfService } from './customer-receipt-pdf.service';
import { toPublicCustomerReceipt } from './customer-receipts.mapper';
import {
  assertAllocationTotals,
  assertPaymentModeBankFields,
  assertSourceTypeRules,
  normalizeTransactionReference,
  roundMoney,
} from './customer-receipts.validation';
import type {
  CancelCustomerReceiptDto,
  CreateCustomerReceiptDto,
  ListCustomerReceiptsQueryDto,
  ScheduleAllocationDto,
  UpdateCustomerReceiptDto,
} from './dto/customer-receipt.dto';
import {
  CustomerReceipt,
  type CustomerReceiptDocument,
  CustomerReceiptPaymentMode,
  CustomerReceiptSourceType,
  CustomerReceiptStatus,
} from './schemas/customer-receipt.schema';

const BOOKING_ELIGIBLE: BookingStatus[] = [
  BookingStatus.Booked,
  BookingStatus.Agreement,
  BookingStatus.Registered,
];

const OPEN_RECEIPT_STATUSES = [
  CustomerReceiptStatus.Draft,
  CustomerReceiptStatus.Posted,
];

@Injectable()
export class CustomerReceiptsService {
  constructor(
    @InjectModel(CustomerReceipt.name)
    private readonly receiptModel: Model<CustomerReceipt>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,
    @InjectModel(PaymentDemand.name)
    private readonly demandModel: Model<PaymentDemand>,
    @InjectModel(PaymentSchedule.name)
    private readonly scheduleModel: Model<PaymentSchedule>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly numberingService: NumberingService,
    private readonly journalService: JournalService,
    private readonly pdfService: CustomerReceiptPdfService,
  ) {}

  async create(dto: CreateCustomerReceiptDto, actorId: string) {
    const booking = await this.requireEligibleBooking(dto.bookingId);
    await this.requireCustomer(dto.customerId);
    if (String(booking.customerId) !== dto.customerId) {
      throw new BadRequestException(
        'customerId does not match booking.customerId',
      );
    }

    const transactionReference = normalizeTransactionReference(
      dto.transactionReference,
    );
    assertSourceTypeRules({
      sourceType: dto.sourceType,
      loanBank: dto.loanBank,
    });
    assertPaymentModeBankFields({
      paymentMode: dto.paymentMode,
      companyBankAccountId: dto.companyBankAccountId,
      transactionReference,
    });

    if (dto.companyBankAccountId) {
      await this.requireActiveBank(
        dto.companyBankAccountId,
        String(booking.projectId),
      );
      await this.assertUniqueTxnRef(
        dto.companyBankAccountId,
        transactionReference,
      );
    }

    const amount = roundMoney(dto.amount);
    const builtAllocations = await this.buildAllocations(
      dto.scheduleAllocation ?? [],
      booking,
      amount,
    );
    const totals = assertAllocationTotals({
      amount,
      allocations: builtAllocations,
    });

    const receiptNumber = await this.numberingService.nextCode(
      NumberEntityType.CUSTOMER_RECEIPT,
      {
        projectId: String(booking.projectId),
        projectScoped: true,
      },
    );

    const row = await this.receiptModel.create({
      receiptNumber,
      customerId: new Types.ObjectId(dto.customerId),
      bookingId: booking._id,
      unitId: booking.unitId,
      projectId: booking.projectId,
      receiptDate: dto.receiptDate
        ? this.parseDate(dto.receiptDate, 'receiptDate')
        : new Date(),
      amount,
      paymentMode: dto.paymentMode,
      companyBankAccountId: dto.companyBankAccountId
        ? new Types.ObjectId(dto.companyBankAccountId)
        : null,
      transactionReference,
      sourceType: dto.sourceType,
      loanBank:
        dto.sourceType === CustomerReceiptSourceType.BankLoan
          ? dto.loanBank!.trim()
          : (dto.loanBank?.trim() ?? null),
      scheduleAllocation: builtAllocations,
      allocatedAmount: totals.allocatedAmount,
      unallocatedAmount: totals.unallocatedAmount,
      receiptDocument: dto.receiptDocument?.trim() ?? null,
      remarks: dto.remarks?.trim() ?? null,
      status: CustomerReceiptStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
    });

    if (dto.post) {
      return this.post(String(row._id), actorId);
    }

    return createSuccessResponse(
      toPublicCustomerReceipt(row),
      'Customer receipt created',
    );
  }

  async update(id: string, dto: UpdateCustomerReceiptDto, actorId: string) {
    const row = await this.requireReceipt(id);
    if (row.status !== CustomerReceiptStatus.Draft) {
      throw new BadRequestException('Only draft receipts can be updated');
    }

    if (dto.bookingId && dto.bookingId !== String(row.bookingId)) {
      throw new BadRequestException('bookingId cannot be changed');
    }
    if (dto.customerId && dto.customerId !== String(row.customerId)) {
      throw new BadRequestException('customerId cannot be changed');
    }

    const booking = await this.requireEligibleBooking(String(row.bookingId));
    const paymentMode = dto.paymentMode ?? row.paymentMode;
    const transactionReference =
      dto.transactionReference !== undefined
        ? normalizeTransactionReference(dto.transactionReference)
        : row.transactionReference;
    const companyBankAccountId =
      dto.companyBankAccountId !== undefined
        ? dto.companyBankAccountId
        : row.companyBankAccountId
          ? String(row.companyBankAccountId)
          : null;
    const sourceType = dto.sourceType ?? row.sourceType;
    const loanBank =
      dto.loanBank !== undefined ? dto.loanBank : row.loanBank;
    const amount =
      dto.amount !== undefined ? roundMoney(dto.amount) : row.amount;

    assertSourceTypeRules({ sourceType, loanBank });
    assertPaymentModeBankFields({
      paymentMode,
      companyBankAccountId,
      transactionReference,
    });

    if (companyBankAccountId) {
      await this.requireActiveBank(
        companyBankAccountId,
        String(booking.projectId),
      );
      await this.assertUniqueTxnRef(
        companyBankAccountId,
        transactionReference,
        String(row._id),
      );
    }

    const allocationInput =
      dto.scheduleAllocation ??
      row.scheduleAllocation.map((a) => ({
        demandId: String(a.demandId),
        amount: a.amount,
      }));
    const builtAllocations = await this.buildAllocations(
      allocationInput,
      booking,
      amount,
      String(row._id),
    );
    const totals = assertAllocationTotals({
      amount,
      allocations: builtAllocations,
    });

    if (dto.receiptDate !== undefined) {
      row.receiptDate = this.parseDate(dto.receiptDate, 'receiptDate');
    }
    row.amount = amount;
    row.paymentMode = paymentMode;
    row.companyBankAccountId = companyBankAccountId
      ? new Types.ObjectId(companyBankAccountId)
      : null;
    row.transactionReference = transactionReference;
    row.sourceType = sourceType;
    row.loanBank =
      sourceType === CustomerReceiptSourceType.BankLoan
        ? (loanBank?.trim() ?? null)
        : (loanBank?.trim() ?? null);
    row.scheduleAllocation = builtAllocations;
    row.allocatedAmount = totals.allocatedAmount;
    row.unallocatedAmount = totals.unallocatedAmount;
    if (dto.receiptDocument !== undefined) {
      row.receiptDocument = dto.receiptDocument?.trim() ?? null;
    }
    if (dto.remarks !== undefined) {
      row.remarks = dto.remarks?.trim() ?? null;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicCustomerReceipt(row),
      'Customer receipt updated',
    );
  }

  async post(id: string, actorId: string) {
    const row = await this.requireReceipt(id);
    if (row.status !== CustomerReceiptStatus.Draft) {
      throw new BadRequestException('Only draft receipts can be posted');
    }

    assertPaymentModeBankFields({
      paymentMode: row.paymentMode,
      companyBankAccountId: row.companyBankAccountId
        ? String(row.companyBankAccountId)
        : null,
      transactionReference: row.transactionReference,
    });

    const booking = await this.requireEligibleBooking(String(row.bookingId));

    // Re-validate allocations against current demand balances
    await this.buildAllocations(
      row.scheduleAllocation.map((a) => ({
        demandId: String(a.demandId),
        amount: a.amount,
      })),
      booking,
      row.amount,
      String(row._id),
    );

    await this.applyAllocations(row);
    const journalId = await this.postCollectionJournal(row, actorId);
    const pdfPath = await this.pdfService.generate(toPublicCustomerReceipt(row));

    row.journalEntryId = new Types.ObjectId(journalId);
    row.receiptPdfPath = pdfPath;
    if (!row.receiptDocument) {
      row.receiptDocument = pdfPath;
    }
    row.status = CustomerReceiptStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicCustomerReceipt(row),
      'Customer receipt posted',
    );
  }

  async cancel(id: string, dto: CancelCustomerReceiptDto, actorId: string) {
    const row = await this.requireReceipt(id);
    if (row.status !== CustomerReceiptStatus.Draft) {
      throw new BadRequestException(
        'Only draft receipts can be cancelled (posted receipts require reversal)',
      );
    }
    row.status = CustomerReceiptStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.reason?.trim() ?? null;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerReceipt(row),
      'Customer receipt cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireReceipt(id);
    return createSuccessResponse(
      toPublicCustomerReceipt(row),
      'Customer receipt retrieved',
    );
  }

  async list(query: ListCustomerReceiptsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CustomerReceipt> = {};

    if (query.status) filter.status = query.status;
    if (query.sourceType) filter.sourceType = query.sourceType;
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      filter.$or = [
        { receiptNumber: { $regex: term, $options: 'i' } },
        { transactionReference: { $regex: term, $options: 'i' } },
      ];
    }

    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const [items, total] = await Promise.all([
      this.receiptModel
        .find(filter)
        .sort({ receiptDate: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.receiptModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicCustomerReceipt(item)),
      'Customer receipts fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  async regeneratePdf(id: string, actorId: string) {
    const row = await this.requireReceipt(id);
    if (row.status !== CustomerReceiptStatus.Posted) {
      throw new BadRequestException(
        'PDF can be regenerated for posted receipts only',
      );
    }
    const pdfPath = await this.pdfService.generate(toPublicCustomerReceipt(row));
    row.receiptPdfPath = pdfPath;
    row.receiptDocument = row.receiptDocument ?? pdfPath;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerReceipt(row),
      'Customer receipt PDF regenerated',
    );
  }

  private async buildAllocations(
    input: ScheduleAllocationDto[],
    booking: Booking & { _id: Types.ObjectId },
    receiptAmount: number,
    excludeReceiptId?: string,
  ) {
    const built: Array<{
      _id: Types.ObjectId;
      demandId: Types.ObjectId;
      scheduleLineId: Types.ObjectId | null;
      milestone: string | null;
      amount: number;
    }> = [];

    const seen = new Set<string>();
    for (const item of input) {
      if (seen.has(item.demandId)) {
        throw new BadRequestException(
          `Duplicate demand allocation for ${item.demandId}`,
        );
      }
      seen.add(item.demandId);

      const demand = await this.requireOpenDemand(
        item.demandId,
        String(booking._id),
        String(booking.customerId),
      );
      const alreadyAllocated = await this.sumOpenAllocationsForDemand(
        item.demandId,
        excludeReceiptId,
      );
      const remaining = roundMoney(
        demand.totalAmount - (demand.collectedAmount ?? 0) - alreadyAllocated,
      );
      const amount = roundMoney(item.amount);
      if (amount > remaining + 0.009) {
        throw new BadRequestException(
          `Allocation ${amount} exceeds remaining demand balance ${remaining} for ${demand.demandNumber}`,
        );
      }

      built.push({
        _id: new Types.ObjectId(),
        demandId: demand._id as Types.ObjectId,
        scheduleLineId: demand.lineId ?? null,
        milestone: demand.milestone ?? null,
        amount,
      });
    }

    assertAllocationTotals({ amount: receiptAmount, allocations: built });
    return built;
  }

  private async applyAllocations(row: CustomerReceipt) {
    for (const allocation of row.scheduleAllocation) {
      const demand = await this.demandModel
        .findById(allocation.demandId)
        .exec();
      if (!demand) {
        throw new NotFoundException(
          `Payment demand not found: ${String(allocation.demandId)}`,
        );
      }

      demand.collectedAmount = roundMoney(
        (demand.collectedAmount ?? 0) + allocation.amount,
      );
      if (demand.collectedAmount + 0.009 >= demand.totalAmount) {
        demand.collectedAmount = demand.totalAmount;
        demand.status = PaymentDemandStatus.Settled;
      }
      await demand.save();

      if (demand.lineId) {
        const schedule = await this.scheduleModel
          .findById(demand.scheduleId)
          .exec();
        if (schedule) {
          const line = (
            schedule.lines as Types.DocumentArray<(typeof schedule.lines)[number]>
          ).id(demand.lineId);
          if (line) {
            const nextCollected = roundMoney(
              (line.collectedAmount ?? 0) + allocation.amount,
            );
            const lineTotal = roundMoney(line.amount + (line.tax ?? 0));
            line.collectedAmount =
              nextCollected + 0.009 >= lineTotal ? lineTotal : nextCollected;
            if (line.collectedAmount + 0.009 >= lineTotal) {
              line.status = PaymentScheduleLineStatus.Paid;
            }
            schedule.markModified('lines');
            await schedule.save();
          }
        }
      }
    }
  }

  private async postCollectionJournal(
    row: CustomerReceiptDocument,
    actorId: string,
  ): Promise<string> {
    const customerAdvance = await this.requireAccountByCategory(
      AccountCategory.CustomerAdvance,
    );

    let debitAccountId: string;
    if (
      row.paymentMode === CustomerReceiptPaymentMode.Cash ||
      !row.companyBankAccountId
    ) {
      const cash = await this.requireAccountByCategory(AccountCategory.Cash);
      debitAccountId = String(cash._id);
    } else {
      const bank = await this.requireActiveBank(
        String(row.companyBankAccountId),
        String(row.projectId),
      );
      debitAccountId = String(bank.ledgerAccountId);
    }

    const projectId = String(row.projectId);
    const journal = await this.journalService.create(
      {
        journalDate: row.receiptDate.toISOString().slice(0, 10),
        projectId,
        sourceModule: 'customer_receipt',
        sourceEntityType: 'customer_receipt',
        sourceEntityId: String(row._id),
        narration:
          `Customer receipt ${row.receiptNumber} (ref ${row.transactionReference ?? 'n/a'})`.slice(
            0,
            500,
          ),
        lines: [
          {
            accountId: debitAccountId,
            debit: row.amount,
            credit: 0,
            projectId,
            description: `Collection ${row.receiptNumber}`,
          },
          {
            accountId: String(customerAdvance._id),
            debit: 0,
            credit: row.amount,
            projectId,
            description: `Customer advance ${row.receiptNumber}`,
            partyType: JournalPartyType.Customer,
            partyId: String(row.customerId),
          },
        ],
        post: true,
      },
      actorId,
      `customer-receipt-journal:${String(row._id)}`,
    );

    const journalId = journal.data?.id;
    if (!journalId) {
      throw new BadRequestException('Journal entry creation failed');
    }
    return journalId;
  }

  private async sumOpenAllocationsForDemand(
    demandId: string,
    excludeReceiptId?: string,
  ): Promise<number> {
    const filter: FilterQuery<CustomerReceipt> = {
      status: { $in: OPEN_RECEIPT_STATUSES },
      'scheduleAllocation.demandId': new Types.ObjectId(demandId),
    };
    if (excludeReceiptId) {
      filter._id = { $ne: new Types.ObjectId(excludeReceiptId) };
    }
    const rows = await this.receiptModel.find(filter).lean().exec();
    let sum = 0;
    for (const row of rows) {
      for (const a of row.scheduleAllocation ?? []) {
        if (String(a.demandId) === demandId) {
          sum += a.amount ?? 0;
        }
      }
    }
    return roundMoney(sum);
  }

  private async assertUniqueTxnRef(
    companyBankAccountId: string | null,
    transactionReference: string | null,
    excludeId?: string,
  ) {
    if (!companyBankAccountId || !transactionReference) return;

    const filter: FilterQuery<CustomerReceipt> = {
      companyBankAccountId: new Types.ObjectId(companyBankAccountId),
      transactionReference,
      status: { $in: OPEN_RECEIPT_STATUSES },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    const existing = await this.receiptModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        'transactionReference already used for this company bank account',
      );
    }
  }

  private async requireOpenDemand(
    demandId: string,
    bookingId: string,
    customerId: string,
  ) {
    if (!Types.ObjectId.isValid(demandId)) {
      throw new BadRequestException('Invalid demandId');
    }
    const demand = await this.demandModel.findById(demandId).exec();
    if (!demand) {
      throw new NotFoundException(`Payment demand not found: ${demandId}`);
    }
    if (String(demand.bookingId) !== bookingId) {
      throw new BadRequestException(
        'Demand bookingId does not match receipt booking',
      );
    }
    if (String(demand.customerId) !== customerId) {
      throw new BadRequestException(
        'Demand customerId does not match receipt customer',
      );
    }
    if (demand.status === PaymentDemandStatus.Cancelled) {
      throw new BadRequestException('Cannot allocate to a cancelled demand');
    }
    if (demand.status === PaymentDemandStatus.Settled) {
      throw new BadRequestException('Demand is already settled');
    }
    return demand;
  }

  private async requireActiveBank(bankAccountId: string, projectId: string) {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new BadRequestException('Invalid companyBankAccountId');
    }
    const bank = await this.bankModel.findById(bankAccountId).exec();
    if (!bank) {
      throw new NotFoundException('Company bank account not found');
    }
    if (bank.status !== BankAccountStatus.Active) {
      throw new BadRequestException('Company bank account is not active');
    }
    if (
      bank.projectId &&
      String(bank.projectId) !== projectId
    ) {
      throw new BadRequestException(
        'Company bank account is not available for this project',
      );
    }
    if (!bank.ledgerAccountId) {
      throw new BadRequestException(
        'Company bank account has no ledger account mapping',
      );
    }
    return bank;
  }

  private async requireAccountByCategory(category: AccountCategory) {
    const account = await this.accountModel
      .findOne({
        accountCategory: category,
        status: AccountStatus.Active,
        allowManualPosting: true,
      })
      .exec();
    if (!account) {
      throw new BadRequestException(
        `No active posting account found for category ${category}`,
      );
    }
    return account;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async requireReceipt(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Customer receipt not found');
    }
    const row = await this.receiptModel.findById(id).exec();
    if (!row) throw new NotFoundException('Customer receipt not found');
    return row;
  }

  private async requireCustomer(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customerId');
    }
    const customer = await this.customerModel.findById(id).select('_id').exec();
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private async requireEligibleBooking(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Booking not found');
    if (!BOOKING_ELIGIBLE.includes(booking.status)) {
      throw new BadRequestException(
        `Booking must be booked, agreement, or registered (current: ${booking.status})`,
      );
    }
    return booking;
  }
}
