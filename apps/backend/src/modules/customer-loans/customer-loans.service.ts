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
import { toPublicCustomerLoan } from './customer-loans.mapper';
import type {
  AddLoanCorrespondenceDto,
  AddLoanDisbursementDto,
  CreateCustomerLoanDto,
  ListCustomerLoanQueryDto,
  TransitionCustomerLoanDto,
  UpdateCustomerLoanDto,
  UpdatePendingDocumentDto,
} from './dto/customer-loan.dto';
import {
  CustomerLoan,
  CustomerLoanStatus,
} from './schemas/customer-loan.schema';

const TERMINAL: CustomerLoanStatus[] = [
  CustomerLoanStatus.Closed,
  CustomerLoanStatus.Rejected,
  CustomerLoanStatus.Cancelled,
];

const ALLOWED_TRANSITIONS: Record<
  CustomerLoanStatus,
  CustomerLoanStatus[]
> = {
  [CustomerLoanStatus.Draft]: [
    CustomerLoanStatus.Applied,
    CustomerLoanStatus.Cancelled,
  ],
  [CustomerLoanStatus.Applied]: [
    CustomerLoanStatus.Sanctioned,
    CustomerLoanStatus.Rejected,
    CustomerLoanStatus.Cancelled,
  ],
  [CustomerLoanStatus.Sanctioned]: [
    CustomerLoanStatus.Disbursing,
    CustomerLoanStatus.Cancelled,
  ],
  [CustomerLoanStatus.Disbursing]: [
    CustomerLoanStatus.Closed,
    CustomerLoanStatus.Cancelled,
  ],
  [CustomerLoanStatus.Closed]: [],
  [CustomerLoanStatus.Rejected]: [],
  [CustomerLoanStatus.Cancelled]: [],
};

@Injectable()
export class CustomerLoansService {
  constructor(
    @InjectModel(CustomerLoan.name)
    private readonly model: Model<CustomerLoan>,
  ) {}

  async create(dto: CreateCustomerLoanDto, actorId: string) {
    const loanNumber = await this.nextNumber(dto.projectId);
    const row = await this.model.create({
      loanNumber,
      companyId: new Types.ObjectId(dto.companyId),
      projectId: new Types.ObjectId(dto.projectId),
      bookingId: new Types.ObjectId(dto.bookingId),
      customerId: new Types.ObjectId(dto.customerId),
      unitId: new Types.ObjectId(dto.unitId),
      bankName: dto.bankName?.trim() ?? null,
      bankBranch: dto.bankBranch?.trim() ?? null,
      loanAccountNumber: dto.loanAccountNumber?.trim() ?? null,
      sanctionAmount: dto.sanctionAmount ?? null,
      sanctionedAt: dto.sanctionedAt ? new Date(dto.sanctionedAt) : null,
      sanctionLetterPath: dto.sanctionLetterPath?.trim() ?? null,
      interestRate: dto.interestRate ?? null,
      tenureMonths: dto.tenureMonths ?? null,
      emiAmount: dto.emiAmount ?? null,
      emiStartDate: dto.emiStartDate ? new Date(dto.emiStartDate) : null,
      status: CustomerLoanStatus.Draft,
      pendingDocuments: (dto.pendingDocuments ?? []).map((d) => ({
        name: d.name.trim(),
        required: d.required ?? true,
        receivedAt: d.receivedAt ? new Date(d.receivedAt) : null,
        filePath: d.filePath?.trim() ?? null,
      })),
      disbursements: [],
      correspondence: [],
      notes: dto.notes?.trim() ?? null,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Customer loan created',
    );
  }

  async update(id: string, dto: UpdateCustomerLoanDto, actorId: string) {
    const row = await this.requireRow(id);
    if (row.status !== CustomerLoanStatus.Draft) {
      throw new BadRequestException('Only draft loans can be updated');
    }

    if (dto.bankName !== undefined) row.bankName = dto.bankName?.trim() ?? null;
    if (dto.bankBranch !== undefined) {
      row.bankBranch = dto.bankBranch?.trim() ?? null;
    }
    if (dto.loanAccountNumber !== undefined) {
      row.loanAccountNumber = dto.loanAccountNumber?.trim() ?? null;
    }
    if (dto.sanctionAmount !== undefined) {
      row.sanctionAmount = dto.sanctionAmount;
    }
    if (dto.sanctionedAt !== undefined) {
      row.sanctionedAt = dto.sanctionedAt ? new Date(dto.sanctionedAt) : null;
    }
    if (dto.sanctionLetterPath !== undefined) {
      row.sanctionLetterPath = dto.sanctionLetterPath?.trim() ?? null;
    }
    if (dto.interestRate !== undefined) row.interestRate = dto.interestRate;
    if (dto.tenureMonths !== undefined) row.tenureMonths = dto.tenureMonths;
    if (dto.emiAmount !== undefined) row.emiAmount = dto.emiAmount;
    if (dto.emiStartDate !== undefined) {
      row.emiStartDate = dto.emiStartDate
        ? new Date(dto.emiStartDate)
        : null;
    }
    if (dto.pendingDocuments !== undefined) {
      row.pendingDocuments = dto.pendingDocuments.map((d) => ({
        name: d.name.trim(),
        required: d.required ?? true,
        receivedAt: d.receivedAt ? new Date(d.receivedAt) : null,
        filePath: d.filePath?.trim() ?? null,
      }));
    }
    if (dto.notes !== undefined) row.notes = dto.notes?.trim() ?? null;

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Customer loan updated',
    );
  }

  async transitionStatus(
    id: string,
    dto: TransitionCustomerLoanDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (TERMINAL.includes(row.status)) {
      throw new BadRequestException(`Loan is already ${row.status}`);
    }
    const allowed = ALLOWED_TRANSITIONS[row.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${row.status} to ${dto.status}`,
      );
    }

    if (dto.status === CustomerLoanStatus.Sanctioned && !row.sanctionAmount) {
      throw new BadRequestException(
        'Sanction amount is required before sanctioning',
      );
    }

    row.status = dto.status;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Loan status updated',
    );
  }

  async addDisbursement(
    id: string,
    dto: AddLoanDisbursementDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (
      row.status !== CustomerLoanStatus.Sanctioned &&
      row.status !== CustomerLoanStatus.Disbursing
    ) {
      throw new BadRequestException(
        'Disbursements can only be added to sanctioned or disbursing loans',
      );
    }

    row.disbursements.push({
      stage: dto.stage.trim(),
      amount: dto.amount,
      disbursedAt: new Date(dto.disbursedAt),
      reference: dto.reference?.trim() ?? null,
      notes: dto.notes?.trim() ?? null,
    });

    if (row.status === CustomerLoanStatus.Sanctioned) {
      row.status = CustomerLoanStatus.Disbursing;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Disbursement added',
    );
  }

  async addCorrespondence(
    id: string,
    dto: AddLoanCorrespondenceDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    if (TERMINAL.includes(row.status)) {
      throw new BadRequestException(
        'Cannot add correspondence to a closed loan',
      );
    }

    row.correspondence.push({
      at: new Date(dto.at),
      subject: dto.subject.trim(),
      body: dto.body.trim(),
      direction: dto.direction,
    });

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Correspondence added',
    );
  }

  async updatePendingDocument(
    id: string,
    documentId: string,
    dto: UpdatePendingDocumentDto,
    actorId: string,
  ) {
    const row = await this.requireRow(id);
    const doc = row.pendingDocuments.find(
      (item) => String(item._id) === documentId,
    );
    if (!doc) {
      throw new NotFoundException('Pending document not found');
    }

    if (dto.receivedAt !== undefined) {
      doc.receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : null;
    }
    if (dto.filePath !== undefined) {
      doc.filePath = dto.filePath?.trim() ?? null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Pending document updated',
    );
  }

  async getById(id: string) {
    const row = await this.requireRow(id);
    return createSuccessResponse(
      toPublicCustomerLoan(row),
      'Customer loan fetched',
    );
  }

  async list(query: ListCustomerLoanQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<CustomerLoan> = {};

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
    if (query.unitId) filter.unitId = new Types.ObjectId(query.unitId);
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
      items.map((row) => toPublicCustomerLoan(row)),
      'Customer loans fetched',
      buildPaginationMeta(page, limit, total),
    );
  }

  private async nextNumber(projectId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.model
      .countDocuments({ projectId: new Types.ObjectId(projectId) })
      .setOptions({ withDeleted: true })
      .exec();
    const seq = String(count + 1).padStart(6, '0');
    return `LN-${year}-${seq}`;
  }

  private async requireRow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid loan id');
    }
    const row = await this.model.findById(id).exec();
    if (!row) throw new NotFoundException('Customer loan not found');
    return row;
  }
}
