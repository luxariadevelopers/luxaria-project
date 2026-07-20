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
import { ApprovalsService } from '../approvals/approvals.service';
import { ApprovalStatus } from '../approvals/schemas/approval-request.schema';
import { BookingsService } from '../bookings/bookings.service';
import {
  Booking,
  BookingStatus,
} from '../bookings/schemas/booking.schema';
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
  CustomerReceipt,
  CustomerReceiptStatus,
} from '../customer-receipts/schemas/customer-receipt.schema';
import { JournalService } from '../journal/journal.service';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { toPublicBookingCancellation } from './booking-cancellations.mapper';
import {
  assertCancellationTransition,
  computeApprovedRefund,
  normalizeRefundTransactionId,
  roundMoney,
} from './booking-cancellations.validation';
import type {
  AddCancellationDocumentDto,
  ApproveBookingCancellationDto,
  ListBookingCancellationsQueryDto,
  ProcessRefundDto,
  RejectBookingCancellationDto,
  RequestBookingCancellationDto,
  ReviewBookingCancellationDto,
} from './dto/booking-cancellation.dto';
import {
  BookingCancellation,
  type BookingCancellationDocument,
  BookingCancellationStatus,
  OPEN_CANCELLATION_STATUSES,
} from './schemas/booking-cancellation.schema';

export const BOOKING_CANCELLATION_APPROVAL_MODULE = 'sales';
export const BOOKING_CANCELLATION_APPROVAL_ENTITY = 'booking_cancellation';

const CANCELLABLE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.Reserved,
  BookingStatus.Booked,
  BookingStatus.Agreement,
];

@Injectable()
export class BookingCancellationsService {
  constructor(
    @InjectModel(BookingCancellation.name)
    private readonly cancellationModel: Model<BookingCancellation>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<Booking>,
    @InjectModel(CustomerReceipt.name)
    private readonly receiptModel: Model<CustomerReceipt>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly numberingService: NumberingService,
    private readonly bookingsService: BookingsService,
    private readonly approvalsService: ApprovalsService,
    private readonly journalService: JournalService,
  ) {}

  async request(dto: RequestBookingCancellationDto, actorId: string) {
    const booking = await this.requireCancellableBooking(dto.bookingId);
    await this.assertNoOpenCancellation(String(booking._id));

    const totalReceived = await this.sumPostedReceipts(String(booking._id));
    const cancellationCharge = roundMoney(dto.cancellationCharge ?? 0);
    const deductions = roundMoney(dto.deductions ?? 0);
    const approvedRefund = computeApprovedRefund({
      totalReceived,
      cancellationCharge,
      deductions,
    });

    const cancellationNumber = await this.numberingService.nextCode(
      NumberEntityType.BOOKING_CANCELLATION,
      {
        projectId: String(booking.projectId),
        projectScoped: true,
      },
    );

    const row = await this.cancellationModel.create({
      cancellationNumber,
      bookingId: booking._id,
      customerId: booking.customerId,
      projectId: booking.projectId,
      unitId: booking.unitId,
      cancellationReason: dto.cancellationReason.trim(),
      cancellationDate: dto.cancellationDate
        ? this.parseDate(dto.cancellationDate, 'cancellationDate')
        : new Date(),
      totalReceived,
      cancellationCharge,
      deductions,
      approvedRefund,
      status: BookingCancellationStatus.Requested,
      remarks: dto.remarks?.trim() ?? null,
      documents: [],
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Booking cancellation requested',
    );
  }

  async review(
    id: string,
    dto: ReviewBookingCancellationDto,
    actorId: string,
  ) {
    const row = await this.requireCancellation(id);
    assertCancellationTransition(
      row.status,
      BookingCancellationStatus.Reviewed,
    );

    if (dto.cancellationCharge !== undefined) {
      row.cancellationCharge = roundMoney(dto.cancellationCharge);
    }
    if (dto.deductions !== undefined) {
      row.deductions = roundMoney(dto.deductions);
    }
    row.approvedRefund = computeApprovedRefund({
      totalReceived: row.totalReceived,
      cancellationCharge: row.cancellationCharge,
      deductions: row.deductions,
    });
    if (dto.remarks !== undefined) {
      row.remarks = dto.remarks?.trim() ?? null;
    }

    row.status = BookingCancellationStatus.Reviewed;
    row.reviewedBy = new Types.ObjectId(actorId);
    row.reviewedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Booking cancellation reviewed',
    );
  }

  async submitForApproval(id: string, actorId: string) {
    const row = await this.requireCancellation(id);
    if (row.status !== BookingCancellationStatus.Reviewed) {
      throw new BadRequestException(
        'Only reviewed cancellations can be submitted for approval',
      );
    }

    const approval = await this.approvalsService.create(
      String(row.projectId),
      {
        module: BOOKING_CANCELLATION_APPROVAL_MODULE,
        entityType: BOOKING_CANCELLATION_APPROVAL_ENTITY,
        entityId: String(row._id),
        amount: row.approvedRefund,
        reason: `Booking cancellation ${row.cancellationNumber} refund ${row.approvedRefund}`,
        submit: true,
      },
      actorId,
    );

    assertCancellationTransition(
      row.status,
      BookingCancellationStatus.PendingApproval,
    );
    row.approvalRequestId = new Types.ObjectId(approval.data!.id);
    row.status = BookingCancellationStatus.PendingApproval;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Booking cancellation submitted for approval',
    );
  }

  async approve(
    id: string,
    dto: ApproveBookingCancellationDto,
    actorId: string,
  ) {
    const row = await this.requireCancellation(id);

    if (row.status === BookingCancellationStatus.Reviewed) {
      // Domain approve without ApprovalsService when short-circuiting
      assertCancellationTransition(
        row.status,
        BookingCancellationStatus.Approved,
      );
    } else if (row.status === BookingCancellationStatus.PendingApproval) {
      if (!row.approvalRequestId) {
        throw new BadRequestException('Approval request is missing');
      }
      const approval = await this.approvalsService.approve(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.comment ?? 'Booking cancellation approved' },
      );
      if (approval.data?.status === ApprovalStatus.Pending) {
        row.set('updatedBy', new Types.ObjectId(actorId));
        await row.save();
        return createSuccessResponse(
          toPublicBookingCancellation(row),
          'Booking cancellation approval step completed',
        );
      }
      if (approval.data?.status !== ApprovalStatus.Approved) {
        throw new BadRequestException('Cancellation approval was not completed');
      }
      assertCancellationTransition(
        row.status,
        BookingCancellationStatus.Approved,
      );
    } else {
      throw new BadRequestException(
        'Only reviewed or pending_approval cancellations can be approved',
      );
    }

    row.status = BookingCancellationStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Booking cancellation approved',
    );
  }

  async reject(
    id: string,
    dto: RejectBookingCancellationDto,
    actorId: string,
  ) {
    const row = await this.requireCancellation(id);
    if (
      row.status !== BookingCancellationStatus.Requested &&
      row.status !== BookingCancellationStatus.Reviewed &&
      row.status !== BookingCancellationStatus.PendingApproval
    ) {
      throw new BadRequestException(
        'Cancellation cannot be rejected in current status',
      );
    }

    if (
      row.status === BookingCancellationStatus.PendingApproval &&
      row.approvalRequestId
    ) {
      await this.approvalsService.reject(
        String(row.projectId),
        String(row.approvalRequestId),
        actorId,
        { comment: dto.reason },
      );
    }

    assertCancellationTransition(
      row.status,
      BookingCancellationStatus.Rejected,
    );
    row.status = BookingCancellationStatus.Rejected;
    row.remarks = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Booking cancellation rejected',
    );
  }

  async processRefund(id: string, dto: ProcessRefundDto, actorId: string) {
    const row = await this.requireCancellation(id);
    if (row.status !== BookingCancellationStatus.Approved) {
      throw new BadRequestException(
        'Only approved cancellations can process refunds',
      );
    }
    if (row.approvedRefund <= 0) {
      throw new BadRequestException(
        'No refund due — use release-unit directly when approvedRefund is zero',
      );
    }

    const txnId = normalizeRefundTransactionId(dto.refundTransactionId);
    if (!txnId) {
      throw new BadRequestException('refundTransactionId is required');
    }
    const bank = await this.requireActiveBank(
      dto.refundBankAccountId,
      String(row.projectId),
    );

    assertCancellationTransition(
      row.status,
      BookingCancellationStatus.RefundProcessed,
    );
    row.refundBankAccountId = bank._id as Types.ObjectId;
    row.refundTransactionId = txnId;
    row.refundProcessedAt = dto.refundDate
      ? this.parseDate(dto.refundDate, 'refundDate')
      : new Date();

    const journalId = await this.postRefundJournal(row, bank, actorId);

    row.journalEntryId = new Types.ObjectId(journalId);
    row.refundProcessedBy = new Types.ObjectId(actorId);
    row.status = BookingCancellationStatus.RefundProcessed;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Customer refund processed and journal posted',
    );
  }

  /**
   * Final step — booking cancelled and unit made available.
   * Only after approval (and refund when money is due).
   */
  async releaseUnit(id: string, actorId: string) {
    const row = await this.requireCancellation(id);

    if (row.approvedRefund > 0) {
      if (row.status !== BookingCancellationStatus.RefundProcessed) {
        throw new BadRequestException(
          'Unit can be released only after refund is processed when approvedRefund > 0',
        );
      }
    } else if (row.status !== BookingCancellationStatus.Approved) {
      throw new BadRequestException(
        'Unit can be released only after cancellation is approved',
      );
    }

    assertCancellationTransition(
      row.status,
      BookingCancellationStatus.UnitReleased,
    );

    await this.bookingsService.finalizeCancellation(
      String(row.bookingId),
      row.cancellationReason,
      actorId,
    );

    row.status = BookingCancellationStatus.UnitReleased;
    row.unitReleasedBy = new Types.ObjectId(actorId);
    row.unitReleasedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Unit released after approved cancellation',
    );
  }

  async addDocument(
    id: string,
    dto: AddCancellationDocumentDto,
    actorId: string,
  ) {
    const row = await this.requireCancellation(id);
    if (
      row.status === BookingCancellationStatus.UnitReleased ||
      row.status === BookingCancellationStatus.Rejected ||
      row.status === BookingCancellationStatus.Cancelled
    ) {
      throw new BadRequestException(
        'Cannot attach documents to a closed cancellation',
      );
    }

    row.documents.push({
      _id: new Types.ObjectId(),
      fileName: dto.fileName.trim(),
      filePath: dto.filePath.trim(),
      mimeType: dto.mimeType?.trim() ?? null,
      category: dto.category?.trim() || 'general',
      uploadedBy: new Types.ObjectId(actorId),
      uploadedAt: new Date(),
    });
    row.markModified('documents');
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Cancellation document attached',
    );
  }

  async getById(id: string) {
    const row = await this.requireCancellation(id);
    return createSuccessResponse(
      toPublicBookingCancellation(row),
      'Booking cancellation retrieved',
    );
  }

  async list(query: ListBookingCancellationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<BookingCancellation> = {};

    if (query.status) filter.status = query.status;
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.search?.trim()) {
      filter.cancellationNumber = {
        $regex: query.search.trim(),
        $options: 'i',
      };
    }

    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const [items, total] = await Promise.all([
      this.cancellationModel
        .find(filter)
        .sort({ cancellationDate: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.cancellationModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicBookingCancellation(item)),
      'Booking cancellations fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async postRefundJournal(
    row: BookingCancellationDocument,
    bank: CompanyBankAccount & { ledgerAccountId: Types.ObjectId },
    actorId: string,
  ): Promise<string> {
    const customerAdvance = await this.requireAccountByCategory(
      AccountCategory.CustomerAdvance,
    );
    const projectId = String(row.projectId);
    const amount = row.approvedRefund;

    const journal = await this.journalService.create(
      {
        journalDate: (row.refundProcessedAt ?? new Date())
          .toISOString()
          .slice(0, 10),
        projectId,
        sourceModule: 'booking_cancellation',
        sourceEntityType: 'booking_cancellation',
        sourceEntityId: String(row._id),
        narration:
          `Customer refund ${row.cancellationNumber} (txn ${row.refundTransactionId ?? 'pending'})`.slice(
            0,
            500,
          ),
        lines: [
          {
            accountId: String(customerAdvance._id),
            debit: amount,
            credit: 0,
            projectId,
            description: `Refund ${row.cancellationNumber}`,
            partyType: JournalPartyType.Customer,
            partyId: String(row.customerId),
          },
          {
            accountId: String(bank.ledgerAccountId),
            debit: 0,
            credit: amount,
            projectId,
            description: `Bank refund ${row.refundTransactionId ?? ''}`.trim(),
          },
        ],
        post: true,
      },
      actorId,
      `booking-cancellation-journal:${String(row._id)}`,
    );

    const journalId = journal.data?.id;
    if (!journalId) {
      throw new BadRequestException('Refund journal entry creation failed');
    }
    return journalId;
  }

  private async sumPostedReceipts(bookingId: string): Promise<number> {
    const rows = await this.receiptModel
      .find({
        bookingId: new Types.ObjectId(bookingId),
        status: CustomerReceiptStatus.Posted,
      })
      .select('amount')
      .lean()
      .exec();
    return roundMoney(rows.reduce((sum, r) => sum + (r.amount ?? 0), 0));
  }

  private async assertNoOpenCancellation(bookingId: string) {
    const existing = await this.cancellationModel
      .findOne({
        bookingId: new Types.ObjectId(bookingId),
        status: { $in: OPEN_CANCELLATION_STATUSES },
      })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Booking already has an open cancellation (${existing.cancellationNumber})`,
      );
    }
  }

  private async requireCancellableBooking(bookingId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new BadRequestException('Invalid bookingId');
    }
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Booking not found');
    if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        `Booking cannot enter cancellation workflow in status ${booking.status}`,
      );
    }
    return booking;
  }

  private async requireActiveBank(bankAccountId: string, projectId: string) {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new BadRequestException('Invalid refundBankAccountId');
    }
    const bank = await this.bankModel.findById(bankAccountId).exec();
    if (!bank) throw new NotFoundException('Company bank account not found');
    if (bank.status !== BankAccountStatus.Active) {
      throw new BadRequestException('Company bank account is not active');
    }
    if (bank.projectId && String(bank.projectId) !== projectId) {
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

  private async requireCancellation(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Booking cancellation not found');
    }
    const row = await this.cancellationModel.findById(id).exec();
    if (!row) throw new NotFoundException('Booking cancellation not found');
    return row;
  }
}
