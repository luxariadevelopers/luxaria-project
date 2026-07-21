import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  AccountingPeriodStatus,
} from '../accounting-period-closure/accounting-period-closure.constants';
import { AccountingPeriod } from '../accounting-period-closure/schemas/accounting-period.schema';
import { Company } from '../company/schemas/company.schema';
import type { ApproveUnlockDto } from './dto/approve-unlock.dto';
import type { CreateFinancialYearDto } from './dto/create-financial-year.dto';
import type { ListFinancialYearsQueryDto } from './dto/list-financial-years-query.dto';
import type { RejectUnlockDto } from './dto/reject-unlock.dto';
import type { RequestUnlockDto } from './dto/request-unlock.dto';
import type { ValidateTransactionDateDto } from './dto/validate-transaction-date.dto';
import {
  type PublicUnlockRequest,
  toPublicFinancialYear,
} from './financial-year.mapper';
import {
  FinancialYearUnlockRequest,
  UnlockRequestStatus,
} from './schemas/financial-year-unlock-request.schema';
import {
  FinancialYear,
  FinancialYearStatus,
} from './schemas/financial-year.schema';

export type TransactionDateValidationResult = {
  valid: boolean;
  reason: string | null;
  financialYear: ReturnType<typeof toPublicFinancialYear> | null;
  forPosting: boolean;
};

@Injectable()
export class FinancialYearService {
  constructor(
    @InjectModel(FinancialYear.name)
    private readonly financialYearModel: Model<FinancialYear>,
    @InjectModel(FinancialYearUnlockRequest.name)
    private readonly unlockRequestModel: Model<FinancialYearUnlockRequest>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(AccountingPeriod.name)
    private readonly accountingPeriodModel: Model<AccountingPeriod>,
  ) {}

  async create(
    dto: CreateFinancialYearDto,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    const startDate = this.startOfDay(new Date(dto.startDate));
    const endDate = this.endOfDay(new Date(dto.endDate));
    this.assertValidRange(startDate, endDate);

    const companyId = await this.resolveScopedCompanyId(
      dto.companyId,
      authenticatedCompanyId,
    );
    await this.assertNoOverlap(companyId, startDate, endDate);

    const setAsCurrent = Boolean(dto.setAsCurrent);
    if (setAsCurrent) {
      await this.clearCurrent(companyId);
    }

    const created = await this.financialYearModel.create({
      companyId,
      name: dto.name.trim(),
      startDate,
      endDate,
      status: FinancialYearStatus.Open,
      isCurrent: setAsCurrent,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
      createdBy: actorId ? new Types.ObjectId(actorId) : null,
    });

    return createSuccessResponse(
      toPublicFinancialYear(created),
      'Financial year created successfully',
    );
  }

  async list(
    query: ListFinancialYearsQueryDto,
    authenticatedCompanyId?: string | null,
  ) {
    const filter: FilterQuery<FinancialYear> = {};
    if (authenticatedCompanyId !== undefined) {
      const companyId = await this.resolveScopedCompanyId(
        query.companyId,
        authenticatedCompanyId,
      );
      const primaryCompanyId = await this.resolveCompanyId(null);
      filter.companyId =
        primaryCompanyId && companyId?.equals(primaryCompanyId)
          ? { $in: [companyId, null] }
          : companyId;
    } else if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.status) filter.status = query.status;
    if (query.isCurrent !== undefined) filter.isCurrent = query.isCurrent;
    if (query.isLocked !== undefined) filter.isLocked = query.isLocked;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortOrder: SortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      this.financialYearModel
        .find(filter)
        .sort({ startDate: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.financialYearModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => toPublicFinancialYear(item)),
      'Financial years fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  async getById(id: string, authenticatedCompanyId?: string | null) {
    const fy = await this.requireFinancialYear(id, authenticatedCompanyId);
    return createSuccessResponse(
      toPublicFinancialYear(fy),
      'Financial year fetched successfully',
    );
  }

  async getCurrent(
    companyId?: string | null,
    authenticatedCompanyId?: string | null,
  ) {
    const resolvedCompanyId = await this.resolveScopedCompanyId(
      companyId,
      authenticatedCompanyId,
    );

    const fy = await this.financialYearModel
      .findOne({ companyId: resolvedCompanyId, isCurrent: true })
      .exec();

    if (!fy) {
      throw new NotFoundException('No current financial year is set');
    }

    return createSuccessResponse(
      toPublicFinancialYear(fy),
      'Current financial year fetched successfully',
    );
  }

  async setCurrent(
    id: string,
    actorId?: string,
    authenticatedCompanyId?: string | null,
  ) {
    const fy = await this.requireFinancialYear(id, authenticatedCompanyId);
    if (fy.isLocked || fy.status === FinancialYearStatus.Locked) {
      throw new BadRequestException('Cannot set a locked financial year as current');
    }

    await this.clearCurrent(fy.companyId);
    const updated = await this.financialYearModel
      .findByIdAndUpdate(
        id,
        {
          isCurrent: true,
          status:
            fy.status === FinancialYearStatus.Closed
              ? FinancialYearStatus.Open
              : fy.status,
          updatedBy: actorId ? new Types.ObjectId(actorId) : null,
        },
        { new: true },
      )
      .exec();

    return createSuccessResponse(
      toPublicFinancialYear(updated!),
      'Current financial year updated successfully',
    );
  }

  async lock(
    id: string,
    actorId: string,
    authenticatedCompanyId?: string | null,
  ) {
    const fy = await this.requireFinancialYear(id, authenticatedCompanyId);
    if (fy.isLocked) {
      throw new ConflictException('Financial year is already locked');
    }

    const updated = await this.financialYearModel
      .findByIdAndUpdate(
        id,
        {
          isLocked: true,
          status: FinancialYearStatus.Locked,
          lockedAt: new Date(),
          lockedBy: new Types.ObjectId(actorId),
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    return createSuccessResponse(
      toPublicFinancialYear(updated!),
      'Financial year locked successfully',
    );
  }

  async requestUnlock(
    id: string,
    dto: RequestUnlockDto,
    actorId: string,
    authenticatedCompanyId?: string | null,
  ) {
    const fy = await this.requireFinancialYear(id, authenticatedCompanyId);
    if (!fy.isLocked) {
      throw new BadRequestException('Financial year is not locked');
    }

    const pending = await this.unlockRequestModel
      .findOne({
        financialYearId: fy._id,
        status: UnlockRequestStatus.Pending,
      })
      .exec();
    if (pending) {
      throw new ConflictException('An unlock request is already pending for this year');
    }

    const request = await this.unlockRequestModel.create({
      financialYearId: fy._id,
      reason: dto.reason.trim(),
      requestedBy: new Types.ObjectId(actorId),
      status: UnlockRequestStatus.Pending,
      createdBy: new Types.ObjectId(actorId),
    });

    return createSuccessResponse(
      this.toPublicUnlockRequest(request),
      'Unlock request submitted; awaiting approval',
    );
  }

  /**
   * Unlock requires special permission (enforced by controller) plus an approved request.
   * Approver must supply approval; reason was captured on the request.
   */
  async approveUnlock(
    financialYearId: string,
    requestId: string,
    dto: ApproveUnlockDto,
    actorId: string,
    authenticatedCompanyId?: string | null,
  ) {
    const fy = await this.requireFinancialYear(
      financialYearId,
      authenticatedCompanyId,
    );
    if (!fy.isLocked) {
      throw new BadRequestException('Financial year is not locked');
    }

    const request = await this.requireUnlockRequest(requestId, financialYearId);
    if (request.status !== UnlockRequestStatus.Pending) {
      throw new BadRequestException('Unlock request is not pending');
    }

    if (String(request.requestedBy) === actorId) {
      throw new ForbiddenException('Approver cannot be the same user who requested unlock');
    }

    request.status = UnlockRequestStatus.Approved;
    request.approvedBy = new Types.ObjectId(actorId);
    request.approvedAt = new Date();
    request.approvalNote = dto.approvalNote?.trim() ?? null;
    await request.save();

    const updated = await this.financialYearModel
      .findByIdAndUpdate(
        financialYearId,
        {
          isLocked: false,
          status: FinancialYearStatus.Open,
          lockedAt: null,
          lockedBy: null,
          updatedBy: new Types.ObjectId(actorId),
        },
        { new: true },
      )
      .exec();

    return createSuccessResponse(
      {
        financialYear: toPublicFinancialYear(updated!),
        unlockRequest: this.toPublicUnlockRequest(request),
      },
      'Financial year unlocked successfully',
    );
  }

  async rejectUnlock(
    financialYearId: string,
    requestId: string,
    dto: RejectUnlockDto,
    actorId: string,
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireFinancialYear(
      financialYearId,
      authenticatedCompanyId,
    );
    const request = await this.requireUnlockRequest(requestId, financialYearId);
    if (request.status !== UnlockRequestStatus.Pending) {
      throw new BadRequestException('Unlock request is not pending');
    }

    request.status = UnlockRequestStatus.Rejected;
    request.rejectedBy = new Types.ObjectId(actorId);
    request.rejectedAt = new Date();
    request.rejectionReason = dto.rejectionReason.trim();
    await request.save();

    return createSuccessResponse(
      this.toPublicUnlockRequest(request),
      'Unlock request rejected',
    );
  }

  async listUnlockRequests(
    financialYearId: string,
    query: { page?: number; limit?: number; status?: UnlockRequestStatus },
    authenticatedCompanyId?: string | null,
  ) {
    await this.requireFinancialYear(
      financialYearId,
      authenticatedCompanyId,
    );
    const filter: FilterQuery<FinancialYearUnlockRequest> = {
      financialYearId: new Types.ObjectId(financialYearId),
    };
    if (query.status) filter.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.unlockRequestModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.unlockRequestModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      items.map((item) => this.toPublicUnlockRequest(item)),
      'Unlock requests fetched successfully',
      buildPaginationMeta(page, limit, total),
    );
  }

  /**
   * Validate a transaction date against financial years.
   * When forPosting is true, locked years reject accounting postings.
   */
  async validateTransactionDate(
    dto: ValidateTransactionDateDto,
    authenticatedCompanyId?: string | null,
  ): Promise<ReturnType<typeof createSuccessResponse<TransactionDateValidationResult>>> {
    const companyId = await this.resolveScopedCompanyId(
      dto.companyId,
      authenticatedCompanyId,
    );
    const result = await this.resolveTransactionDate(
      new Date(dto.transactionDate),
      {
        forPosting: dto.forPosting !== false,
        companyId: companyId ? String(companyId) : null,
      },
    );

    return createSuccessResponse(
      result,
      result.valid
        ? 'Transaction date is valid for the financial year'
        : 'Transaction date is not valid for posting',
    );
  }

  /**
   * Programmatic guard for accounting modules.
   * Throws ForbiddenException when the date cannot be used for posting.
   */
  async assertPostingAllowed(
    transactionDate: Date | string,
    companyId?: string | null,
  ): Promise<ReturnType<typeof toPublicFinancialYear>> {
    const result = await this.resolveTransactionDate(
      typeof transactionDate === 'string' ? new Date(transactionDate) : transactionDate,
      { forPosting: true, companyId },
    );

    if (!result.valid || !result.financialYear) {
      throw new ForbiddenException(
        result.reason ?? 'Transaction date is not allowed for accounting posting',
      );
    }

    return result.financialYear;
  }

  async resolveTransactionDate(
    transactionDate: Date,
    options: { forPosting: boolean; companyId?: string | null },
  ): Promise<TransactionDateValidationResult> {
    if (Number.isNaN(transactionDate.getTime())) {
      return {
        valid: false,
        reason: 'Invalid transaction date',
        financialYear: null,
        forPosting: options.forPosting,
      };
    }

    const companyId = await this.resolveCompanyId(options.companyId ?? null);
    const day = this.startOfDay(transactionDate);

    const fy = await this.financialYearModel
      .findOne({
        companyId,
        startDate: { $lte: this.endOfDay(day) },
        endDate: { $gte: day },
      })
      .exec();

    if (!fy) {
      return {
        valid: false,
        reason: 'No financial year covers this transaction date',
        financialYear: null,
        forPosting: options.forPosting,
      };
    }

    if (options.forPosting && (fy.isLocked || fy.status === FinancialYearStatus.Locked)) {
      return {
        valid: false,
        reason: 'Financial year is locked; accounting postings are rejected',
        financialYear: toPublicFinancialYear(fy),
        forPosting: options.forPosting,
      };
    }

    if (fy.status === FinancialYearStatus.Closed && options.forPosting) {
      return {
        valid: false,
        reason: 'Financial year is closed; accounting postings are rejected',
        financialYear: toPublicFinancialYear(fy),
        forPosting: options.forPosting,
      };
    }

    if (options.forPosting) {
      const blockedPeriod = await this.accountingPeriodModel
        .findOne({
          status: {
            $in: [AccountingPeriodStatus.Locked, AccountingPeriodStatus.Closed],
          },
          periodFrom: { $lte: this.endOfDay(day) },
          periodTo: { $gte: day },
        })
        .select('periodNumber status periodType')
        .lean()
        .exec();

      if (blockedPeriod) {
        return {
          valid: false,
          reason: `Accounting period ${blockedPeriod.periodNumber} is ${blockedPeriod.status}; accounting postings are rejected`,
          financialYear: toPublicFinancialYear(fy),
          forPosting: options.forPosting,
        };
      }
    }

    return {
      valid: true,
      reason: null,
      financialYear: toPublicFinancialYear(fy),
      forPosting: options.forPosting,
    };
  }

  private async assertNoOverlap(
    companyId: Types.ObjectId | null,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
  ) {
    const filter: FilterQuery<FinancialYear> = {
      companyId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    if (excludeId) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const overlapping = await this.financialYearModel.findOne(filter).lean().exec();
    if (overlapping) {
      throw new ConflictException(
        `Financial year overlaps existing year "${overlapping.name}" (${overlapping.startDate.toISOString().slice(0, 10)} – ${overlapping.endDate.toISOString().slice(0, 10)})`,
      );
    }
  }

  private async clearCurrent(companyId: Types.ObjectId | null) {
    await this.financialYearModel
      .updateMany({ companyId, isCurrent: true }, { isCurrent: false })
      .exec();
  }

  private async resolveCompanyId(
    companyId?: string | null,
  ): Promise<Types.ObjectId | null> {
    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid company id');
      }
      const company = await this.companyModel.findById(companyId).select('_id').lean().exec();
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      return company._id as Types.ObjectId;
    }

    const primary = await this.companyModel
      .findOne({ isPrimary: true })
      .select('_id')
      .lean()
      .exec();
    return primary?._id ? (primary._id as Types.ObjectId) : null;
  }

  private async resolveScopedCompanyId(
    requestedCompanyId?: string | null,
    authenticatedCompanyId?: string | null,
  ): Promise<Types.ObjectId | null> {
    if (authenticatedCompanyId === undefined) {
      return this.resolveCompanyId(requestedCompanyId);
    }

    const actorCompanyId = await this.resolveCompanyId(
      authenticatedCompanyId,
    );
    if (requestedCompanyId) {
      const requested = await this.resolveCompanyId(requestedCompanyId);
      if (String(requested) !== String(actorCompanyId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return actorCompanyId;
  }

  private assertValidRange(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }

  private async requireFinancialYear(
    id: string,
    authenticatedCompanyId?: string | null,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid financial year id');
    }
    const fy = await this.financialYearModel.findById(id).exec();
    if (!fy) {
      throw new NotFoundException('Financial year not found');
    }
    if (authenticatedCompanyId !== undefined) {
      const actorCompanyId = await this.resolveCompanyId(
        authenticatedCompanyId,
      );
      const financialYearCompanyId =
        fy.companyId ?? (await this.resolveCompanyId(null));
      if (String(financialYearCompanyId) !== String(actorCompanyId)) {
        throw new ForbiddenException('Access denied');
      }
    }
    return fy;
  }

  private async requireUnlockRequest(requestId: string, financialYearId: string) {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException('Invalid unlock request id');
    }
    const request = await this.unlockRequestModel.findById(requestId).exec();
    if (!request || String(request.financialYearId) !== financialYearId) {
      throw new NotFoundException('Unlock request not found');
    }
    return request;
  }

  private toPublicUnlockRequest(request: {
    _id: Types.ObjectId;
    financialYearId: Types.ObjectId;
    reason: string;
    requestedBy: Types.ObjectId;
    status: UnlockRequestStatus;
    approvedBy?: Types.ObjectId | null;
    approvedAt?: Date | null;
    approvalNote?: string | null;
    rejectedBy?: Types.ObjectId | null;
    rejectedAt?: Date | null;
    rejectionReason?: string | null;
    createdAt?: Date;
  }): PublicUnlockRequest {
    return {
      id: String(request._id),
      financialYearId: String(request.financialYearId),
      reason: request.reason,
      requestedBy: String(request.requestedBy),
      status: request.status,
      approvedBy: request.approvedBy ? String(request.approvedBy) : null,
      approvedAt: request.approvedAt ?? null,
      approvalNote: request.approvalNote ?? null,
      rejectedBy: request.rejectedBy ? String(request.rejectedBy) : null,
      rejectedAt: request.rejectedAt ?? null,
      rejectionReason: request.rejectionReason ?? null,
      createdAt: request.createdAt,
    };
  }
}
