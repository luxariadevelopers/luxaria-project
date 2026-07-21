import {
  BadRequestException,
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
import { JournalService } from '../journal/journal.service';
import { JournalPartyType } from '../journal/schemas/journal-entry.schema';
import { toPublicCustomerInvoice } from './customer-invoices.mapper';
import type {
  CancelCustomerInvoiceDto,
  CreateCustomerInvoiceDto,
  CustomerInvoiceLineDto,
  ListCustomerInvoicesQueryDto,
  UpdateCustomerInvoiceDto,
} from './dto/customer-invoice.dto';
import {
  CustomerInvoice,
  CustomerInvoiceLine,
  CustomerInvoiceStatus,
  type CustomerInvoiceDocument,
} from './schemas/customer-invoice.schema';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class CustomerInvoicesService {
  constructor(
    @InjectModel(CustomerInvoice.name)
    private readonly model: Model<CustomerInvoice>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly journalService: JournalService,
  ) {}

  async create(dto: CreateCustomerInvoiceDto, actorId: string) {
    const totals = this.computeTotals(dto.lines, dto.cgst, dto.sgst, dto.igst);
    const invoiceNumber = await this.nextNumber(dto.projectId);

    const row = await this.model.create({
      invoiceNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: new Types.ObjectId(dto.projectId),
      bookingId: new Types.ObjectId(dto.bookingId),
      customerId: new Types.ObjectId(dto.customerId),
      unitId: dto.unitId ? new Types.ObjectId(dto.unitId) : null,
      invoiceDate: this.parseDate(dto.invoiceDate, 'invoiceDate'),
      dueDate: dto.dueDate ? this.parseDate(dto.dueDate, 'dueDate') : null,
      status: CustomerInvoiceStatus.Draft,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      totalAmount: totals.totalAmount,
      placeOfSupply: dto.placeOfSupply?.trim() ?? null,
      hsnSac: dto.hsnSac?.trim() ?? null,
      lines: this.mapLines(dto.lines),
      journalEntryId: null,
      gstDocumentId: null,
      demandId: dto.demandId ? new Types.ObjectId(dto.demandId) : null,
      paymentScheduleId: dto.paymentScheduleId
        ? new Types.ObjectId(dto.paymentScheduleId)
        : null,
      notes: dto.notes?.trim() ?? null,
      postedBy: null,
      postedAt: null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicCustomerInvoice(row),
      'Customer invoice created',
    );
  }

  async update(id: string, dto: UpdateCustomerInvoiceDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== CustomerInvoiceStatus.Draft) {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    if (dto.projectId) row.projectId = new Types.ObjectId(dto.projectId);
    if (dto.bookingId) row.bookingId = new Types.ObjectId(dto.bookingId);
    if (dto.customerId) row.customerId = new Types.ObjectId(dto.customerId);
    if (dto.unitId !== undefined) {
      row.unitId = dto.unitId ? new Types.ObjectId(dto.unitId) : null;
    }
    if (dto.invoiceDate) {
      row.invoiceDate = this.parseDate(dto.invoiceDate, 'invoiceDate');
    }
    if (dto.dueDate !== undefined) {
      row.dueDate = dto.dueDate
        ? this.parseDate(dto.dueDate, 'dueDate')
        : null;
    }
    if (dto.placeOfSupply !== undefined) {
      row.placeOfSupply = dto.placeOfSupply?.trim() ?? null;
    }
    if (dto.hsnSac !== undefined) row.hsnSac = dto.hsnSac?.trim() ?? null;
    if (dto.demandId !== undefined) {
      row.demandId = dto.demandId ? new Types.ObjectId(dto.demandId) : null;
    }
    if (dto.paymentScheduleId !== undefined) {
      row.paymentScheduleId = dto.paymentScheduleId
        ? new Types.ObjectId(dto.paymentScheduleId)
        : null;
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    if (dto.lines) {
      row.lines = this.mapLines(dto.lines);
      const totals = this.computeTotals(
        dto.lines,
        dto.cgst ?? row.cgst,
        dto.sgst ?? row.sgst,
        dto.igst ?? row.igst,
      );
      row.taxableAmount = totals.taxableAmount;
      row.cgst = totals.cgst;
      row.sgst = totals.sgst;
      row.igst = totals.igst;
      row.totalAmount = totals.totalAmount;
    } else if (
      dto.cgst !== undefined ||
      dto.sgst !== undefined ||
      dto.igst !== undefined
    ) {
      const totals = this.computeTotals(
        row.lines.map((line) => ({
          description: line.description,
          taxableAmount: line.taxableAmount,
          taxAmount: line.taxAmount,
          totalAmount: line.totalAmount,
        })),
        dto.cgst ?? row.cgst,
        dto.sgst ?? row.sgst,
        dto.igst ?? row.igst,
      );
      row.taxableAmount = totals.taxableAmount;
      row.cgst = totals.cgst;
      row.sgst = totals.sgst;
      row.igst = totals.igst;
      row.totalAmount = totals.totalAmount;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerInvoice(row),
      'Customer invoice updated',
    );
  }

  async post(id: string, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== CustomerInvoiceStatus.Draft) {
      throw new BadRequestException('Only draft invoices can be posted');
    }
    if (row.totalAmount <= 0) {
      throw new BadRequestException('Invoice total must be > 0');
    }

    const journalEntryId = await this.postRevenueJournal(row, actorId);
    row.status = CustomerInvoiceStatus.Posted;
    row.journalEntryId = new Types.ObjectId(journalEntryId);
    row.postedBy = new Types.ObjectId(actorId);
    row.postedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicCustomerInvoice(row),
      'Customer invoice posted',
    );
  }

  async cancel(id: string, dto: CancelCustomerInvoiceDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== CustomerInvoiceStatus.Draft) {
      throw new BadRequestException('Only draft invoices can be cancelled');
    }
    row.status = CustomerInvoiceStatus.Cancelled;
    if (dto.reason?.trim()) {
      row.notes = [row.notes, `Cancelled: ${dto.reason.trim()}`]
        .filter(Boolean)
        .join('\n');
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerInvoice(row),
      'Customer invoice cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicCustomerInvoice(row),
      'Customer invoice fetched',
    );
  }

  async list(query: ListCustomerInvoicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CustomerInvoice> = {};
    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.bookingId) {
      filter.bookingId = new Types.ObjectId(query.bookingId);
    }
    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }
    if (query.status) filter.status = query.status;

    const sortField = query.sortBy ?? 'createdAt';
    const sort: Record<string, SortOrder> = {
      [sortField]: query.sortOrder === 'asc' ? 1 : -1,
    };

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((row) => toPublicCustomerInvoice(row)),
      'Customer invoices fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async postRevenueJournal(
    row: CustomerInvoiceDocument,
    actorId: string,
  ): Promise<string> {
    const customerAdvance = await this.requireAccountByCategory(
      AccountCategory.CustomerAdvance,
    );
    const sales = await this.requireAccountByCategory(AccountCategory.Sales);

    const projectId = String(row.projectId);
    const totalTax = roundMoney(row.cgst + row.sgst + row.igst);
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
        accountId: String(customerAdvance._id),
        debit: row.totalAmount,
        credit: 0,
        projectId,
        description: `Customer advance — invoice ${row.invoiceNumber}`,
        partyType: JournalPartyType.Customer,
        partyId: String(row.customerId),
      },
      {
        accountId: String(sales._id),
        debit: 0,
        credit: row.taxableAmount,
        projectId,
        description: `Sales revenue — invoice ${row.invoiceNumber}`,
      },
    ];

    if (totalTax > 0) {
      const outputGst = await this.requireAccountByCategory(
        AccountCategory.OutputGst,
      );
      lines.push({
        accountId: String(outputGst._id),
        debit: 0,
        credit: totalTax,
        projectId,
        description: `Output GST — invoice ${row.invoiceNumber}`,
      });
    }

    const journal = await this.journalService.create(
      {
        journalDate: row.invoiceDate.toISOString().slice(0, 10),
        projectId,
        sourceModule: 'customer_invoice',
        sourceEntityType: 'customer_invoice',
        sourceEntityId: String(row._id),
        narration: `Customer invoice ${row.invoiceNumber} revenue recognition`.slice(
          0,
          500,
        ),
        lines,
        post: true,
      },
      actorId,
      `customer-invoice-journal:${String(row._id)}`,
    );

    const journalId = journal.data?.id;
    if (!journalId) {
      throw new BadRequestException('Journal entry creation failed');
    }
    return journalId;
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

  private computeTotals(
    lines: CustomerInvoiceLineDto[],
    cgst = 0,
    sgst = 0,
    igst = 0,
  ) {
    if (!lines.length) {
      throw new BadRequestException('Invoice requires at least one line');
    }

    let taxableAmount = 0;
    let lineTotal = 0;
    for (const line of lines) {
      taxableAmount += line.taxableAmount ?? 0;
      lineTotal += line.totalAmount ?? 0;
    }
    taxableAmount = roundMoney(taxableAmount);
    lineTotal = roundMoney(lineTotal);

    const taxTotal = roundMoney(
      roundMoney(cgst) + roundMoney(sgst) + roundMoney(igst),
    );
    const totalAmount = roundMoney(taxableAmount + taxTotal);

    if (Math.abs(lineTotal - totalAmount) > 0.02) {
      throw new BadRequestException(
        'Line totals must equal taxableAmount + cgst + sgst + igst',
      );
    }

    return {
      taxableAmount,
      cgst: roundMoney(cgst),
      sgst: roundMoney(sgst),
      igst: roundMoney(igst),
      totalAmount,
    };
  }

  private mapLines(lines: CustomerInvoiceLineDto[]): CustomerInvoiceLine[] {
    return lines.map((line) => ({
      description: line.description.trim(),
      taxableAmount: roundMoney(line.taxableAmount),
      taxAmount: roundMoney(line.taxAmount ?? 0),
      totalAmount: roundMoney(line.totalAmount),
    }));
  }

  private parseDate(value: string, field: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return date;
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    return `CINV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer invoice id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Customer invoice not found');
    return row;
  }
}
