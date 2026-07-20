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
import { ContractorBillsService } from '../contractor-bills/contractor-bills.service';
import {
  ContractorBill,
  ContractorBillStatus,
} from '../contractor-bills/schemas/contractor-bill.schema';
import {
  Contractor,
  ContractorStatus,
} from '../contractors/schemas/contractor.schema';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { JournalService } from '../journal/journal.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import type {
  ContractorPaymentAllocationDto,
  CreateContractorPaymentDto,
  ListContractorPaymentsQueryDto,
  UpdateContractorPaymentDto,
} from './dto/contractor-payment.dto';
import { toPublicContractorPayment } from './contractor-payments.mapper';
import {
  assertAllocationsBalance,
  computeBankAmount,
  computeRemainingBillPayable,
  normalizeTransactionReference,
  roundMoney,
} from './contractor-payments.validation';
import {
  ContractorPayment,
  ContractorPaymentAllocation,
  ContractorPaymentDocument,
  ContractorPaymentStatus,
} from './schemas/contractor-payment.schema';

const MONEY_EPS = 0.005;

const OPEN_PAYMENT_STATUSES = [
  ContractorPaymentStatus.Draft,
  ContractorPaymentStatus.Approval,
  ContractorPaymentStatus.Released,
  ContractorPaymentStatus.Verified,
];

@Injectable()
export class ContractorPaymentsService {
  constructor(
    @InjectModel(ContractorPayment.name)
    private readonly paymentModel: Model<ContractorPayment>,
    @InjectModel(ContractorBill.name)
    private readonly billModel: Model<ContractorBill>,
    @InjectModel(Contractor.name)
    private readonly contractorModel: Model<Contractor>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly contractorBillsService: ContractorBillsService,
    private readonly numberingService: NumberingService,
    private readonly journalService: JournalService,
  ) {}

  async create(dto: CreateContractorPaymentDto, actorId: string) {
    const built = await this.buildPayload(dto);
    const paymentNumber = await this.numberingService.nextCode(
      NumberEntityType.CONTRACTOR_PAYMENT,
      {
        asOf: built.paymentDate,
        projectId: built.projectId,
        projectScoped: true,
      },
    );

    const row = await this.paymentModel.create({
      paymentNumber,
      contractorId: new Types.ObjectId(built.contractorId),
      projectId: new Types.ObjectId(built.projectId),
      billIds: built.billIds.map((id) => new Types.ObjectId(id)),
      allocations: built.allocations,
      paymentDate: built.paymentDate,
      amount: built.amount,
      paymentMode: built.paymentMode,
      bankAccountId: new Types.ObjectId(built.bankAccountId),
      transactionReference: built.transactionReference,
      tds: built.tds,
      retention: built.retention,
      advanceRecovery: built.advanceRecovery,
      penalty: built.penalty,
      bankAmount: built.bankAmount,
      paymentProof: built.paymentProof,
      status: ContractorPaymentStatus.Draft,
      notes: built.notes,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment created as draft',
    );
  }

  async update(id: string, dto: UpdateContractorPaymentDto, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== ContractorPaymentStatus.Draft) {
      throw new BadRequestException(
        'Only draft contractor payments can be updated',
      );
    }

    const merged: CreateContractorPaymentDto = {
      contractorId: String(row.contractorId),
      projectId: String(row.projectId),
      allocations:
        dto.allocations ??
        row.allocations.map((a) => ({
          billId: String(a.billId),
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
      advanceRecovery: dto.advanceRecovery ?? row.advanceRecovery,
      penalty: dto.penalty ?? row.penalty,
      paymentProof:
        dto.paymentProof !== undefined ? dto.paymentProof : row.paymentProof,
      notes: dto.notes !== undefined ? dto.notes : row.notes,
    };

    const built = await this.buildPayload(merged, String(row._id));

    row.contractorId = new Types.ObjectId(built.contractorId);
    row.projectId = new Types.ObjectId(built.projectId);
    row.billIds = built.billIds.map((id) => new Types.ObjectId(id));
    row.allocations = built.allocations;
    row.paymentDate = built.paymentDate;
    row.amount = built.amount;
    row.paymentMode = built.paymentMode;
    row.bankAccountId = new Types.ObjectId(built.bankAccountId);
    row.transactionReference = built.transactionReference;
    row.tds = built.tds;
    row.retention = built.retention;
    row.advanceRecovery = built.advanceRecovery;
    row.penalty = built.penalty;
    row.bankAmount = built.bankAmount;
    row.paymentProof = built.paymentProof;
    row.notes = built.notes;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== ContractorPaymentStatus.Draft) {
      throw new BadRequestException('Only draft payments can be submitted');
    }
    await this.revalidateOpenPayment(row);

    row.status = ContractorPaymentStatus.Approval;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment submitted for approval',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== ContractorPaymentStatus.Approval) {
      throw new BadRequestException(
        'Only payments in approval can be approved',
      );
    }
    await this.revalidateOpenPayment(row);

    row.status = ContractorPaymentStatus.Released;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment approved and released for bank execution',
    );
  }

  async release(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== ContractorPaymentStatus.Released) {
      throw new BadRequestException(
        'Only released payments can record bank release',
      );
    }
    if (row.releasedBy) {
      throw new ConflictException('Payment bank release already recorded');
    }
    if (!row.transactionReference?.trim()) {
      throw new BadRequestException(
        'transactionReference is required before release',
      );
    }
    if (!row.paymentProof?.trim()) {
      throw new BadRequestException(
        'paymentProof is required before bank release',
      );
    }

    row.releasedBy = new Types.ObjectId(actorId);
    row.releasedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment bank release recorded',
    );
  }

  async verify(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== ContractorPaymentStatus.Released) {
      throw new BadRequestException('Only released payments can be verified');
    }
    if (!row.releasedBy) {
      throw new BadRequestException(
        'Bank release must be recorded before verification',
      );
    }
    await this.revalidateOpenPayment(row);

    row.status = ContractorPaymentStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment verified',
    );
  }

  /**
   * Verified → Posted.
   * Journal: Dr Contractor Payable / Cr TDS / Cr Retention / Cr Other Income (penalty+advance) / Cr Bank.
   */
  async post(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    if (row.status !== ContractorPaymentStatus.Verified) {
      throw new BadRequestException('Only verified payments can be posted');
    }
    if (row.journalEntryId) {
      throw new ConflictException('Payment already has a journal entry');
    }
    await this.revalidateOpenPayment(row);

    const journalId = await this.postPaymentJournal(row, actorId);

    for (const allocation of row.allocations) {
      await this.contractorBillsService.applyPaymentAllocation(
        String(allocation.billId),
        allocation.amount,
        actorId,
      );
    }

    row.journalEntryId = new Types.ObjectId(journalId);
    row.status = ContractorPaymentStatus.Posted;
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment posted',
    );
  }

  async cancel(id: string, actorId: string) {
    const row = await this.requirePayment(id);
    const cancellable = [
      ContractorPaymentStatus.Draft,
      ContractorPaymentStatus.Approval,
      ContractorPaymentStatus.Released,
      ContractorPaymentStatus.Verified,
    ];
    if (!cancellable.includes(row.status)) {
      throw new BadRequestException(
        'Posted payments cannot be cancelled; reverse via journal',
      );
    }

    row.status = ContractorPaymentStatus.Cancelled;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requirePayment(id);
    return createSuccessResponse(
      toPublicContractorPayment(row),
      'Contractor payment retrieved',
    );
  }

  async list(query: ListContractorPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<ContractorPayment> = {};

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.contractorId) {
      filter.contractorId = new Types.ObjectId(query.contractorId);
    }
    if (query.status) filter.status = query.status;
    if (query.billId) {
      filter.billIds = new Types.ObjectId(query.billId);
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
      items.map((row) => toPublicContractorPayment(row)),
      'Contractor payments listed',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async buildPayload(
    dto: CreateContractorPaymentDto,
    excludePaymentId?: string,
  ) {
    await this.requireActiveContractor(dto.contractorId);
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
    const advanceRecovery = roundMoney(dto.advanceRecovery ?? 0);
    const penalty = roundMoney(dto.penalty ?? 0);
    assertAllocationsBalance({ amount, allocations: dto.allocations });
    const bankAmount = computeBankAmount({
      amount,
      tds,
      retention,
      advanceRecovery,
      penalty,
    });

    const paymentDate = this.parseDate(dto.paymentDate, 'paymentDate');
    const allocations = await this.buildAllocations(
      dto.allocations,
      dto.contractorId,
      dto.projectId,
      excludePaymentId,
    );

    return {
      contractorId: dto.contractorId,
      projectId: dto.projectId,
      billIds: allocations.map((a) => String(a.billId)),
      allocations,
      paymentDate,
      amount,
      paymentMode: dto.paymentMode,
      bankAccountId: dto.bankAccountId,
      transactionReference,
      tds,
      retention,
      advanceRecovery,
      penalty,
      bankAmount,
      paymentProof: dto.paymentProof?.trim() || null,
      notes: dto.notes?.trim() || null,
    };
  }

  private async buildAllocations(
    dtos: ContractorPaymentAllocationDto[],
    contractorId: string,
    projectId: string,
    excludePaymentId?: string,
  ): Promise<ContractorPaymentAllocation[]> {
    const seen = new Set<string>();
    const allocations: ContractorPaymentAllocation[] = [];

    for (const dto of dtos) {
      const billId = dto.billId;
      if (seen.has(billId)) {
        throw new BadRequestException(
          `Duplicate bill allocation for ${billId}`,
        );
      }
      seen.add(billId);

      const bill = await this.requirePayableBill(
        billId,
        contractorId,
        projectId,
      );
      const amount = roundMoney(dto.amount);
      const reserved = await this.sumOpenAllocations(billId, excludePaymentId);
      const remaining = computeRemainingBillPayable({
        netPayable: bill.netPayable,
        paidAmount: bill.paidAmount ?? 0,
      });
      const available = roundMoney(remaining - reserved);
      if (amount - available > MONEY_EPS) {
        throw new BadRequestException(
          `Payment allocation (${amount}) exceeds available payable (${available}) on bill ${bill.billNumber}`,
        );
      }

      allocations.push({
        billId: new Types.ObjectId(billId),
        billNumber: bill.billNumber,
        raNumber: bill.raNumber,
        amount,
      });
    }

    return allocations;
  }

  private async revalidateOpenPayment(row: ContractorPaymentDocument) {
    await this.buildAllocations(
      row.allocations.map((a) => ({
        billId: String(a.billId),
        amount: a.amount,
      })),
      String(row.contractorId),
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
    billId: string,
    excludePaymentId?: string,
  ): Promise<number> {
    const filter: FilterQuery<ContractorPayment> = {
      status: { $in: OPEN_PAYMENT_STATUSES },
      'allocations.billId': new Types.ObjectId(billId),
    };
    if (excludePaymentId) {
      filter._id = { $ne: new Types.ObjectId(excludePaymentId) };
    }

    const rows = await this.paymentModel.find(filter).lean().exec();
    let sum = 0;
    for (const row of rows) {
      for (const a of row.allocations ?? []) {
        if (String(a.billId) === billId) {
          sum += a.amount ?? 0;
        }
      }
    }
    return roundMoney(sum);
  }

  private async postPaymentJournal(
    row: ContractorPaymentDocument,
    actorId: string,
  ): Promise<string> {
    const contractorPayable = await this.requireAccountByCategory(
      AccountCategory.ContractorPayable,
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
        accountId: String(contractorPayable._id),
        debit: row.amount,
        credit: 0,
        projectId,
        description: `Contractor payment ${row.paymentNumber}`,
        partyType: JournalPartyType.Contractor,
        partyId: String(row.contractorId),
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
    const otherCredits = roundMoney(row.advanceRecovery + row.penalty);
    if (otherCredits > 0) {
      lines.push({
        accountId: String(otherIncome._id),
        debit: 0,
        credit: otherCredits,
        projectId,
        description: `Advance recovery / penalty ${row.paymentNumber}`,
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
        sourceModule: 'contractor_payment',
        sourceEntityType: 'contractor_payment',
        sourceEntityId: String(row._id),
        narration:
          `Contractor payment ${row.paymentNumber} (ref ${row.transactionReference})`.slice(
            0,
            500,
          ),
        lines,
        post: true,
      },
      actorId,
      `contractor-payment-journal:${String(row._id)}`,
    );

    const journalId = journal.data?.id;
    if (!journalId) {
      throw new BadRequestException('Journal entry creation failed');
    }
    return journalId;
  }

  private async requirePayableBill(
    billId: string,
    contractorId: string,
    projectId: string,
  ) {
    if (!Types.ObjectId.isValid(billId)) {
      throw new BadRequestException('Invalid billId');
    }
    const bill = await this.billModel.findById(billId).exec();
    if (!bill) {
      throw new NotFoundException(`Contractor bill not found: ${billId}`);
    }
    if (String(bill.contractorId) !== contractorId) {
      throw new BadRequestException(
        'Bill contractorId does not match payment contractorId',
      );
    }
    if (String(bill.projectId) !== projectId) {
      throw new BadRequestException(
        'Bill projectId does not match payment projectId',
      );
    }
    if (
      bill.status !== ContractorBillStatus.Posted &&
      bill.status !== ContractorBillStatus.Paid
    ) {
      throw new BadRequestException(
        `Only posted running bills can be paid (${bill.billNumber} is ${bill.status})`,
      );
    }
    return bill;
  }

  private async requireActiveContractor(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contractorId');
    }
    const contractor = await this.contractorModel.findById(id).exec();
    if (!contractor || contractor.status !== ContractorStatus.Active) {
      throw new NotFoundException(`Active contractor not found: ${id}`);
    }
    return contractor;
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
    if (!bank.ledgerAccountId) {
      throw new BadRequestException(
        'Bank account is missing ledgerAccountId for posting',
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
    const filter: FilterQuery<ContractorPayment> = {
      transactionReference,
      bankAccountId: new Types.ObjectId(bankAccountId),
      status: { $ne: ContractorPaymentStatus.Cancelled },
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

  private async requirePayment(
    id: string,
  ): Promise<ContractorPaymentDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contractor payment id');
    }
    const row = await this.paymentModel.findById(id).exec();
    if (!row) throw new NotFoundException('Contractor payment not found');
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
