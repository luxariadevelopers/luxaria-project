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
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { JournalService } from '../journal/journal.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Vendor, VendorStatus } from '../vendors/schemas/vendor.schema';
import { VendorInvoicesService } from '../vendor-invoices/vendor-invoices.service';
import { VendorInvoice } from '../vendor-invoices/schemas/vendor-invoice.schema';
import type {
  CreateVendorPaymentDto,
  ListVendorPaymentsQueryDto,
  UpdateVendorPaymentDto,
  VendorPaymentAllocationDto,
} from './dto/vendor-payment.dto';
import { toPublicVendorPayment } from './vendor-payments.mapper';
import {
  assertAllocationsBalance,
  computeBankAmount,
  computeRemainingPayable,
  normalizeTransactionReference,
  roundMoney,
} from './vendor-payments.validation';
import {
  VendorPayment,
  VendorPaymentAllocation,
  VendorPaymentDocument,
  VendorPaymentStatus,
} from './schemas/vendor-payment.schema';

const MONEY_EPS = 0.005;

const OPEN_PAYMENT_STATUSES = [
  VendorPaymentStatus.Draft,
  VendorPaymentStatus.Approval,
  VendorPaymentStatus.Released,
  VendorPaymentStatus.Verified,
];

@Injectable()
export class VendorPaymentsService {
  constructor(
    @InjectModel(VendorPayment.name)
    private readonly paymentModel: Model<VendorPayment>,
    @InjectModel(VendorInvoice.name)
    private readonly invoiceModel: Model<VendorInvoice>,
    @InjectModel(Vendor.name)
    private readonly vendorModel: Model<Vendor>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly vendorInvoicesService: VendorInvoicesService,
    private readonly numberingService: NumberingService,
    private readonly journalService: JournalService,
  ) {}

  async create(dto: CreateVendorPaymentDto, actorId: string) {
    const built = await this.buildPayload(dto);
    const paymentNumber = await this.numberingService.nextCode(
      NumberEntityType.VENDOR_PAYMENT,
      {
        asOf: built.paymentDate,
        projectId: built.projectId,
        projectScoped: true,
      },
    );

    const row = await this.paymentModel.create({
      paymentNumber,
      vendorId: new Types.ObjectId(built.vendorId),
      projectId: new Types.ObjectId(built.projectId),
      invoiceIds: built.invoiceIds.map((id) => new Types.ObjectId(id)),
      allocations: built.allocations,
      paymentDate: built.paymentDate,
      amount: built.amount,
      paymentMode: built.paymentMode,
      bankAccountId: new Types.ObjectId(built.bankAccountId),
      transactionReference: built.transactionReference,
      tds: built.tds,
      retention: built.retention,
      deductions: built.deductions,
      bankAmount: built.bankAmount,
      paymentProof: built.paymentProof,
      status: VendorPaymentStatus.Draft,
      notes: built.notes,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment created as draft',
    );
  }

  async update(id: string, dto: UpdateVendorPaymentDto, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== VendorPaymentStatus.Draft) {
      throw new BadRequestException('Only draft vendor payments can be updated');
    }

    const merged: CreateVendorPaymentDto = {
      vendorId: String(row.vendorId),
      projectId: String(row.projectId),
      allocations:
        dto.allocations ??
        row.allocations.map((a) => ({
          invoiceId: String(a.invoiceId),
          amount: a.amount,
        })),
      paymentDate:
        dto.paymentDate ?? row.paymentDate.toISOString().slice(0, 10),
      amount: dto.amount ?? row.amount,
      paymentMode: dto.paymentMode ?? row.paymentMode,
      bankAccountId: dto.bankAccountId ?? String(row.bankAccountId),
      transactionReference:
        dto.transactionReference ?? row.transactionReference,
      tds: dto.tds ?? row.tds,
      retention: dto.retention ?? row.retention,
      deductions: dto.deductions ?? row.deductions,
      paymentProof:
        dto.paymentProof !== undefined ? dto.paymentProof : row.paymentProof,
      notes: dto.notes !== undefined ? dto.notes : row.notes,
    };

    const built = await this.buildPayload(merged, String(row._id));

    row.vendorId = new Types.ObjectId(built.vendorId);
    row.projectId = new Types.ObjectId(built.projectId);
    row.invoiceIds = built.invoiceIds.map((id) => new Types.ObjectId(id));
    row.allocations = built.allocations;
    row.paymentDate = built.paymentDate;
    row.amount = built.amount;
    row.paymentMode = built.paymentMode;
    row.bankAccountId = new Types.ObjectId(built.bankAccountId);
    row.transactionReference = built.transactionReference;
    row.tds = built.tds;
    row.retention = built.retention;
    row.deductions = built.deductions;
    row.bankAmount = built.bankAmount;
    row.paymentProof = built.paymentProof;
    row.notes = built.notes;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment updated',
    );
  }

  /** Draft → Approval */
  async submit(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== VendorPaymentStatus.Draft) {
      throw new BadRequestException('Only draft payments can be submitted');
    }
    await this.revalidateOpenPayment(row);

    row.status = VendorPaymentStatus.Approval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment submitted for approval',
    );
  }

  /** Approval → Released */
  async approve(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== VendorPaymentStatus.Approval) {
      throw new BadRequestException(
        'Only payments in approval can be approved',
      );
    }
    await this.revalidateOpenPayment(row);

    row.status = VendorPaymentStatus.Released;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment approved and released for bank execution',
    );
  }

  /**
   * Released stays Released — records bank release (releasedBy).
   * Requires transactionReference (already on document).
   */
  async release(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== VendorPaymentStatus.Released) {
      throw new BadRequestException(
        'Only released payments can record bank release',
      );
    }
    if (row.releasedBy) {
      throw new ConflictException('Payment bank release already recorded');
    }
    if (!row.transactionReference?.trim()) {
      throw new BadRequestException(
        'transactionReference (transaction ID) is required before release',
      );
    }

    row.releasedBy = new Types.ObjectId(actorId);
    row.releasedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment bank release recorded',
    );
  }

  /** Released → Verified */
  async verify(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== VendorPaymentStatus.Released) {
      throw new BadRequestException('Only released payments can be verified');
    }
    if (!row.releasedBy) {
      throw new BadRequestException(
        'Bank release must be recorded before verification',
      );
    }
    if (!row.transactionReference?.trim()) {
      throw new BadRequestException(
        'transactionReference (transaction ID) is required before verification',
      );
    }
    await this.revalidateOpenPayment(row);

    row.status = VendorPaymentStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment verified',
    );
  }

  /**
   * Verified → Posted.
   * Journal: Dr Vendor Payable / Cr TDS / Cr Retention / Cr Other Income (deductions) / Cr Bank.
   * Allocations applied to invoice paidAmount.
   */
  async post(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== VendorPaymentStatus.Verified) {
      throw new BadRequestException('Only verified payments can be posted');
    }
    if (row.journalEntryId) {
      throw new ConflictException('Payment already has a journal entry');
    }
    await this.revalidateOpenPayment(row);

    const journalId = await this.postPaymentJournal(row, actorId);

    for (const allocation of row.allocations) {
      await this.vendorInvoicesService.applyPaymentAllocation(
        String(allocation.invoiceId),
        allocation.amount,
        actorId,
      );
    }

    row.journalEntryId = new Types.ObjectId(journalId);
    row.status = VendorPaymentStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment posted',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    const cancellable = [
      VendorPaymentStatus.Draft,
      VendorPaymentStatus.Approval,
      VendorPaymentStatus.Released,
      VendorPaymentStatus.Verified,
    ];
    if (!cancellable.includes(row.status)) {
      throw new BadRequestException(
        'Posted payments cannot be cancelled; reverse via journal',
      );
    }

    row.status = VendorPaymentStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requirePayment(id);
    return createSuccessResponse(
      toPublicVendorPayment(row),
      'Vendor payment fetched successfully',
    );
  }

  async list(query: ListVendorPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<VendorPayment> = {};

    if (query.projectId) filter.projectId = new Types.ObjectId(query.projectId);
    if (query.vendorId) filter.vendorId = new Types.ObjectId(query.vendorId);
    if (query.status) filter.status = query.status;
    if (query.invoiceId) {
      filter.invoiceIds = new Types.ObjectId(query.invoiceId);
    }
    if (query.search?.trim()) {
      filter.$text = { $search: query.search.trim() };
    }

    const sort: Record<string, SortOrder> = { paymentDate: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicVendorPayment(row)),
      'Vendor payments fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async buildPayload(
    dto: CreateVendorPaymentDto,
    excludePaymentId?: string,
  ) {
    await this.requireActiveVendor(dto.vendorId);
    await this.requireActiveBank(dto.bankAccountId, dto.projectId);

    const transactionReference = normalizeTransactionReference(
      dto.transactionReference,
    );
    await this.assertUniqueTxnRef(
      transactionReference,
      dto.bankAccountId,
      excludePaymentId,
    );

    const amount = roundMoney(dto.amount);
    const tds = roundMoney(dto.tds ?? 0);
    const retention = roundMoney(dto.retention ?? 0);
    const deductions = roundMoney(dto.deductions ?? 0);
    assertAllocationsBalance({ amount, allocations: dto.allocations });
    const bankAmount = computeBankAmount({
      amount,
      tds,
      retention,
      deductions,
    });

    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const allocations = await this.buildAllocations(
      dto.allocations,
      dto.vendorId,
      dto.projectId,
      excludePaymentId,
    );

    return {
      vendorId: dto.vendorId,
      projectId: dto.projectId,
      invoiceIds: allocations.map((a) => String(a.invoiceId)),
      allocations,
      paymentDate,
      amount,
      paymentMode: dto.paymentMode,
      bankAccountId: dto.bankAccountId,
      transactionReference,
      tds,
      retention,
      deductions,
      bankAmount,
      paymentProof: dto.paymentProof?.trim() || null,
      notes: dto.notes?.trim() || null,
    };
  }

  private async buildAllocations(
    dtos: VendorPaymentAllocationDto[],
    vendorId: string,
    projectId: string,
    excludePaymentId?: string,
  ): Promise<VendorPaymentAllocation[]> {
    const seen = new Set<string>();
    const allocations: VendorPaymentAllocation[] = [];

    for (const dto of dtos) {
      const invoiceId = dto.invoiceId;
      if (seen.has(invoiceId)) {
        throw new BadRequestException(
          `Duplicate invoice allocation for ${invoiceId}`,
        );
      }
      seen.add(invoiceId);

      const invoice = await this.requirePayableInvoice(
        invoiceId,
        vendorId,
        projectId,
      );
      const amount = roundMoney(dto.amount);
      const reserved = await this.sumOpenAllocations(
        invoiceId,
        excludePaymentId,
      );
      const remaining = computeRemainingPayable({
        totalAmount: invoice.totalAmount,
        tds: invoice.tds,
        retention: invoice.retention,
        paidAmount: invoice.paidAmount ?? 0,
      });
      const available = roundMoney(remaining - reserved);
      if (amount - available > MONEY_EPS) {
        throw new BadRequestException(
          `Payment allocation (${amount}) exceeds available payable (${available}) on invoice ${invoice.documentNumber}`,
        );
      }

      allocations.push({
        invoiceId: new Types.ObjectId(invoiceId),
        invoiceDocumentNumber: invoice.documentNumber,
        invoiceNumber: invoice.invoiceNumber,
        amount,
      });
    }

    return allocations;
  }

  private async revalidateOpenPayment(row: VendorPaymentDocument) {
    await this.buildAllocations(
      row.allocations.map((a) => ({
        invoiceId: String(a.invoiceId),
        amount: a.amount,
      })),
      String(row.vendorId),
      String(row.projectId),
      String(row._id),
    );
    await this.requireActiveBank(
      String(row.bankAccountId),
      String(row.projectId),
    );
    normalizeTransactionReference(row.transactionReference);
  }

  private async sumOpenAllocations(
    invoiceId: string,
    excludePaymentId?: string,
  ): Promise<number> {
    const filter: FilterQuery<VendorPayment> = {
      status: { $in: OPEN_PAYMENT_STATUSES },
      'allocations.invoiceId': new Types.ObjectId(invoiceId),
    };
    if (excludePaymentId) {
      filter._id = { $ne: new Types.ObjectId(excludePaymentId) };
    }

    const rows = await this.paymentModel.find(filter).lean().exec();
    let sum = 0;
    for (const row of rows) {
      for (const a of row.allocations ?? []) {
        if (String(a.invoiceId) === invoiceId) {
          sum += a.amount ?? 0;
        }
      }
    }
    return roundMoney(sum);
  }

  private async postPaymentJournal(
    row: VendorPaymentDocument,
    actorId: string,
  ): Promise<string> {
    const vendorPayable = await this.requireAccountByCategory(
      AccountCategory.VendorPayable,
    );
    const tdsPayable = await this.requireAccountByCategory(
      AccountCategory.TdsPayable,
    );
    const retentionPayable = await this.requireAccountByCategory(
      AccountCategory.RetentionPayable,
    );
    const otherIncome = await this.requireAccountByCategory(
      AccountCategory.OtherIncome,
    );
    const bank = await this.requireActiveBank(
      String(row.bankAccountId),
      String(row.projectId),
    );

    const projectId = String(row.projectId);
    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      projectId: string;
      description: string;
      partyType?: JournalPartyType;
      partyId?: string;
    }> = [
      {
        accountId: String(vendorPayable._id),
        debit: row.amount,
        credit: 0,
        projectId,
        description: `Vendor payment ${row.paymentNumber}`,
        partyType: JournalPartyType.Vendor,
        partyId: String(row.vendorId),
      },
    ];

    if (row.tds > 0) {
      lines.push({
        accountId: String(tdsPayable._id),
        debit: 0,
        credit: row.tds,
        projectId,
        description: `TDS withheld ${row.paymentNumber}`,
      });
    }
    if (row.retention > 0) {
      lines.push({
        accountId: String(retentionPayable._id),
        debit: 0,
        credit: row.retention,
        projectId,
        description: `Retention withheld ${row.paymentNumber}`,
      });
    }
    if (row.deductions > 0) {
      lines.push({
        accountId: String(otherIncome._id),
        debit: 0,
        credit: row.deductions,
        projectId,
        description: `Payment deductions ${row.paymentNumber}`,
      });
    }
    if (row.bankAmount > 0) {
      lines.push({
        accountId: String(bank.ledgerAccountId),
        debit: 0,
        credit: row.bankAmount,
        projectId,
        description: `Bank payment ${row.transactionReference}`,
      });
    }

    const journal = await this.journalService.create(
      {
        journalDate: row.paymentDate.toISOString().slice(0, 10),
        projectId,
        sourceModule: 'vendor_payment',
        sourceEntityType: 'vendor_payment',
        sourceEntityId: String(row._id),
        narration:
          `Vendor payment ${row.paymentNumber} (ref ${row.transactionReference})`.slice(
            0,
            500,
          ),
        lines,
        post: true,
      },
      actorId,
      `vendor-payment-journal:${String(row._id)}`,
    );

    const journalId = journal.data?.id;
    if (!journalId) {
      throw new BadRequestException('Journal entry creation failed');
    }
    return journalId;
  }

  private async requirePayableInvoice(
    invoiceId: string,
    vendorId: string,
    projectId: string,
  ) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new BadRequestException('Invalid invoiceId');
    }
    const invoice = await this.invoiceModel.findById(invoiceId).exec();
    if (!invoice) {
      throw new NotFoundException(`Vendor invoice not found: ${invoiceId}`);
    }
    if (String(invoice.vendorId) !== vendorId) {
      throw new BadRequestException(
        'Invoice vendorId does not match payment vendorId',
      );
    }
    if (String(invoice.projectId) !== projectId) {
      throw new BadRequestException(
        'Invoice projectId does not match payment projectId',
      );
    }
    await this.vendorInvoicesService.assertPayable(invoiceId);
    return invoice;
  }

  private async requireActiveVendor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendorId');
    }
    const vendor = await this.vendorModel.findById(id).exec();
    if (!vendor || vendor.status !== VendorStatus.Active) {
      throw new NotFoundException(`Active vendor not found: ${id}`);
    }
    return vendor;
  }

  private async requireActiveBank(bankAccountId: string, projectId: string) {
    if (!Types.ObjectId.isValid(bankAccountId)) {
      throw new BadRequestException('Invalid bankAccountId');
    }
    const bank = await this.bankModel.findById(bankAccountId).exec();
    if (!bank) {
      throw new NotFoundException('Bank account not found');
    }
    if (bank.status !== BankAccountStatus.Active) {
      throw new BadRequestException('Bank account is not active');
    }
    if (bank.projectId && String(bank.projectId) !== projectId) {
      throw new BadRequestException(
        'Bank account is not available for this project',
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

  private async assertUniqueTxnRef(
    transactionReference: string,
    bankAccountId: string,
    excludePaymentId?: string,
  ) {
    const filter: FilterQuery<VendorPayment> = {
      transactionReference,
      bankAccountId: new Types.ObjectId(bankAccountId),
      status: { $ne: VendorPaymentStatus.Cancelled },
    };
    if (excludePaymentId) {
      filter._id = { $ne: new Types.ObjectId(excludePaymentId) };
    }
    const existing = await this.paymentModel.findOne(filter).lean().exec();
    if (existing) {
      throw new ConflictException(
        'transactionReference already used for this bank account',
      );
    }
  }

  private async requirePayment(id: string): Promise<VendorPaymentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid vendor payment id');
    }
    const row = await this.paymentModel.findById(id).exec();
    if (!row) throw new NotFoundException('Vendor payment not found');
    return row;
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }
}
