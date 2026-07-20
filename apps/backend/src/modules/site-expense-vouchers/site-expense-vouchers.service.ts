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
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  IdempotencyService,
  SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
} from '../../database/services/idempotency.service';
import {
  CashAccountKind,
  CashAccountStatus,
} from '../cash-accounts/schemas/cash-account.schema';
import { CashAccountsService } from '../cash-accounts/cash-accounts.service';
import {
  Account,
  AccountCategory,
  AccountStatus,
  AccountType,
} from '../chart-of-accounts/schemas/account.schema';
import { ExpenseCategoryStatus } from '../expense-categories/schemas/expense-category.schema';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { JournalService } from '../journal/journal.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { Project } from '../projects/schemas/project.schema';
import type {
  CancelSiteExpenseVoucherDto,
  CreateSiteExpenseVoucherDto,
  ListSiteExpenseVouchersQueryDto,
  RejectSiteExpenseVoucherDto,
  ReturnSiteExpenseVoucherDto,
  SiteExpenseAttachmentDto,
  UpdateSiteExpenseVoucherDto,
} from './dto/site-expense-voucher.dto';
import {
  type PublicSiteExpenseVoucher,
  toPublicSiteExpenseVoucher,
} from './site-expense-vouchers.mapper';
import {
  SiteExpenseAttachmentType,
  SiteExpenseVoucher,
  SiteExpenseVoucherStatus,
} from './schemas/site-expense-voucher.schema';

const MONEY_EPS = 0.005;
const DEFAULT_SITE_RADIUS_METERS = 500;
const EARTH_RADIUS_M = 6_371_000;

const EDITABLE_STATUSES = [
  SiteExpenseVoucherStatus.Draft,
  SiteExpenseVoucherStatus.Returned,
];

@Injectable()
export class SiteExpenseVouchersService {
  constructor(
    @InjectModel(SiteExpenseVoucher.name)
    private readonly voucherModel: Model<SiteExpenseVoucher>,
    @InjectModel(Project.name)
    private readonly projectModel: Model<Project>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly cashAccountsService: CashAccountsService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
    private readonly journalService: JournalService,
    private readonly numberingService: NumberingService,
    private readonly financialYearService: FinancialYearService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async create(
    dto: CreateSiteExpenseVoucherDto,
    actorId: string,
    idempotencyKey?: string | null,
  ) {
    const requestHash = this.idempotencyService.hashRequest({
      ...dto,
      actorId,
    });

    if (idempotencyKey) {
      const begin = await this.idempotencyService.begin({
        key: idempotencyKey,
        scope: SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicSiteExpenseVoucher>;
      }
    }

    try {
      if (idempotencyKey) {
        const dup = await this.voucherModel
          .findOne({ idempotencyKey: idempotencyKey.trim() })
          .lean()
          .exec();
        if (dup) {
          throw new ConflictException(
            'A site expense voucher with this idempotency key already exists',
          );
        }
      }

      const project = await this.requireProject(dto.projectId);
      await this.requirePettyCash(dto.pettyCashAccountId, dto.projectId);
      await this.requireActiveCategory(dto.expenseCategoryId);
      const attachments = this.normalizeAttachments(dto.attachments);

      const expenseDate = new Date(dto.expenseDate);
      const warnings = await this.buildWarnings({
        project,
        expenseDate,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        billNumber: dto.billNumber ?? null,
        amount: dto.amount,
        projectId: dto.projectId,
      });

      const voucherNumber = await this.numberingService.nextCode(
        NumberEntityType.EXPENSE_VOUCHER,
        {
          asOf: expenseDate,
          projectId: dto.projectId,
          projectScoped: true,
        },
      );

      const row = await this.voucherModel.create({
        voucherNumber,
        projectId: new Types.ObjectId(dto.projectId),
        pettyCashAccountId: new Types.ObjectId(dto.pettyCashAccountId),
        expenseDate,
        expenseCategoryId: new Types.ObjectId(dto.expenseCategoryId),
        amount: dto.amount,
        paidTo: dto.paidTo.trim(),
        mobileNumber: dto.mobileNumber?.trim() || null,
        purpose: dto.purpose.trim(),
        boqItemId: dto.boqItemId
          ? new Types.ObjectId(dto.boqItemId)
          : null,
        paymentMode: dto.paymentMode,
        billNumber: dto.billNumber?.trim() || null,
        billDate: dto.billDate ? new Date(dto.billDate) : null,
        attachments,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        deviceId: dto.deviceId?.trim() || null,
        submittedBy: null,
        submittedAt: null,
        status: SiteExpenseVoucherStatus.Draft,
        warnings,
        idempotencyKey: idempotencyKey?.trim() ?? null,
        journalEntryId: null,
        debitAccountId: null,
        createdBy: new Types.ObjectId(actorId),
      });

      const response = createSuccessResponse(
        toPublicSiteExpenseVoucher(row),
        warnings.length
          ? 'Site expense voucher created as draft (with warnings)'
          : 'Site expense voucher created as draft',
      );

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          idempotencyKey,
          SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.fail(
          idempotencyKey,
          SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateSiteExpenseVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    this.assertEditable(row);

    if (dto.pettyCashAccountId !== undefined) {
      await this.requirePettyCash(
        dto.pettyCashAccountId,
        String(row.projectId),
      );
      row.pettyCashAccountId = new Types.ObjectId(dto.pettyCashAccountId);
    }
    if (dto.expenseCategoryId !== undefined) {
      await this.requireActiveCategory(dto.expenseCategoryId);
      row.expenseCategoryId = new Types.ObjectId(dto.expenseCategoryId);
    }
    if (dto.expenseDate !== undefined) {
      row.expenseDate = new Date(dto.expenseDate);
    }
    if (dto.amount !== undefined) row.amount = dto.amount;
    if (dto.paidTo !== undefined) row.paidTo = dto.paidTo.trim();
    if (dto.mobileNumber !== undefined) {
      row.mobileNumber = dto.mobileNumber?.trim() || null;
    }
    if (dto.purpose !== undefined) row.purpose = dto.purpose.trim();
    if (dto.boqItemId !== undefined) {
      row.boqItemId = dto.boqItemId
        ? new Types.ObjectId(dto.boqItemId)
        : null;
    }
    if (dto.paymentMode !== undefined) row.paymentMode = dto.paymentMode;
    if (dto.billNumber !== undefined) {
      row.billNumber = dto.billNumber?.trim() || null;
    }
    if (dto.billDate !== undefined) {
      row.billDate = dto.billDate ? new Date(dto.billDate) : null;
    }
    if (dto.attachments !== undefined) {
      row.attachments = this.normalizeAttachments(dto.attachments);
    }
    if (dto.latitude !== undefined) row.latitude = dto.latitude;
    if (dto.longitude !== undefined) row.longitude = dto.longitude;
    if (dto.deviceId !== undefined) {
      row.deviceId = dto.deviceId?.trim() || null;
    }

    await this.requireActiveCategory(String(row.expenseCategoryId));

    const project = await this.requireProject(String(row.projectId));
    row.warnings = await this.buildWarnings({
      project,
      expenseDate: row.expenseDate,
      latitude: row.latitude,
      longitude: row.longitude,
      billNumber: row.billNumber,
      amount: row.amount,
      projectId: String(row.projectId),
      excludeVoucherId: String(row._id),
    });

    if (row.status === SiteExpenseVoucherStatus.Returned) {
      row.status = SiteExpenseVoucherStatus.Draft;
      row.rejectionReason = null;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher updated',
    );
  }

  async submit(id: string, actorId: string) {
    const row = await this.requireVoucher(id);
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or returned vouchers can be submitted',
      );
    }

    const category = await this.requireActiveCategory(
      String(row.expenseCategoryId),
    );
    this.assertEvidenceRules(category, row.attachments);

    const project = await this.requireProject(String(row.projectId));
    row.warnings = await this.buildWarnings({
      project,
      expenseDate: row.expenseDate,
      latitude: row.latitude,
      longitude: row.longitude,
      billNumber: row.billNumber,
      amount: row.amount,
      projectId: String(row.projectId),
      excludeVoucherId: String(row._id),
    });

    row.status = SiteExpenseVoucherStatus.Submitted;
    row.submittedBy = new Types.ObjectId(actorId);
    row.submittedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher submitted',
    );
  }

  async verify(id: string, actorId: string) {
    const row = await this.requireVoucher(id);
    if (row.status !== SiteExpenseVoucherStatus.Submitted) {
      throw new BadRequestException('Only submitted vouchers can be verified');
    }
    if (row.submittedBy && String(row.submittedBy) === actorId) {
      throw new ForbiddenException(
        'Verifier cannot be the same user who submitted the voucher',
      );
    }

    const category = await this.requireActiveCategory(
      String(row.expenseCategoryId),
    );
    this.assertEvidenceRules(category, row.attachments);

    row.status = SiteExpenseVoucherStatus.Verified;
    row.verifiedBy = new Types.ObjectId(actorId);
    row.verifiedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher verified',
    );
  }

  async approve(id: string, actorId: string) {
    const row = await this.requireVoucher(id);
    if (row.status !== SiteExpenseVoucherStatus.Verified) {
      throw new BadRequestException('Only verified vouchers can be approved');
    }
    if (row.verifiedBy && String(row.verifiedBy) === actorId) {
      throw new ForbiddenException(
        'Approver cannot be the same user who verified the voucher',
      );
    }

    await this.requireActiveCategory(String(row.expenseCategoryId));

    row.status = SiteExpenseVoucherStatus.Approved;
    row.approvedBy = new Types.ObjectId(actorId);
    row.approvedAt = new Date();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();

    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher approved',
    );
  }

  async post(id: string, actorId: string, idempotencyKey?: string | null) {
    const row = await this.requireVoucher(id);
    const postKey =
      idempotencyKey?.trim() || `sev-post:${String(row._id)}`;

    const requestHash = this.idempotencyService.hashRequest({
      voucherId: String(row._id),
      action: 'post',
    });

    const begin = await this.idempotencyService.begin({
      key: postKey,
      scope: SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
      userId: actorId,
      requestHash,
    });
    if (begin.outcome === 'replay') {
      return begin.response as unknown as ApiResponseDto<PublicSiteExpenseVoucher>;
    }

    try {
      if (row.status !== SiteExpenseVoucherStatus.Approved) {
        throw new BadRequestException('Only approved vouchers can be posted');
      }
      if (row.journalEntryId) {
        throw new ConflictException('Voucher already has a journal entry');
      }
      if (row.approvedBy && String(row.approvedBy) === actorId) {
        throw new ForbiddenException(
          'Poster cannot be the same user who approved the voucher',
        );
      }

      const project = await this.requireProject(String(row.projectId));
      await this.financialYearService.assertPostingAllowed(
        row.expenseDate,
        project.companyId ? String(project.companyId) : undefined,
      );

      const category = await this.requireActiveCategory(
        String(row.expenseCategoryId),
      );
      this.assertEvidenceRules(category, row.attachments);

      const cash = await this.requirePettyCash(
        String(row.pettyCashAccountId),
        String(row.projectId),
      );
      await this.cashAccountsService.assertSufficientBalance(
        String(row.pettyCashAccountId),
        row.amount,
      );

      const debitAccountId = await this.resolveDebitAccount(
        category.defaultLedgerAccountId,
        row.boqItemId ? String(row.boqItemId) : null,
      );

      const journalKey = `sev-journal:${String(row._id)}`;
      const journalResponse = await this.journalService.create(
        {
          journalDate: row.expenseDate.toISOString().slice(0, 10),
          projectId: String(row.projectId),
          sourceModule: 'site_expense',
          sourceEntityType: 'expense_voucher',
          sourceEntityId: String(row._id),
          narration: `Site expense ${row.voucherNumber} — ${row.purpose}`.slice(
            0,
            500,
          ),
          lines: [
            {
              accountId: debitAccountId,
              debit: row.amount,
              credit: 0,
              projectId: String(row.projectId),
              boqItemId: row.boqItemId ? String(row.boqItemId) : undefined,
              description: row.purpose,
            },
            {
              accountId: cash.ledgerAccountId,
              debit: 0,
              credit: row.amount,
              projectId: String(row.projectId),
              description: `Petty cash payment to ${row.paidTo}`,
            },
          ],
          post: true,
        },
        actorId,
        journalKey,
      );

      const journalId = journalResponse.data?.id;
      if (!journalId) {
        throw new BadRequestException('Journal entry creation failed');
      }

      row.journalEntryId = new Types.ObjectId(journalId);
      row.debitAccountId = new Types.ObjectId(debitAccountId);
      row.status = SiteExpenseVoucherStatus.Posted;
      row.postedBy = new Types.ObjectId(actorId);
      row.postedAt = new Date();
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save();

      const response = createSuccessResponse(
        toPublicSiteExpenseVoucher(row),
        'Site expense voucher posted',
      );

      await this.idempotencyService.complete(
        postKey,
        SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
        response as unknown as Record<string, unknown>,
      );

      return response;
    } catch (error) {
      await this.idempotencyService.fail(
        postKey,
        SITE_EXPENSE_VOUCHER_IDEMPOTENCY_SCOPE,
      );
      throw error;
    }
  }

  async reject(
    id: string,
    dto: RejectSiteExpenseVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    if (
      ![
        SiteExpenseVoucherStatus.Submitted,
        SiteExpenseVoucherStatus.Verified,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Only submitted or verified vouchers can be rejected',
      );
    }
    row.status = SiteExpenseVoucherStatus.Rejected;
    row.rejectedBy = new Types.ObjectId(actorId);
    row.rejectedAt = new Date();
    row.rejectionReason = dto.reason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher rejected',
    );
  }

  async returnForCorrection(
    id: string,
    dto: ReturnSiteExpenseVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    if (
      ![
        SiteExpenseVoucherStatus.Submitted,
        SiteExpenseVoucherStatus.Verified,
      ].includes(row.status)
    ) {
      throw new BadRequestException(
        'Only submitted or verified vouchers can be returned',
      );
    }
    row.status = SiteExpenseVoucherStatus.Returned;
    row.rejectionReason = dto.comment?.trim() || 'Returned for correction';
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher returned for correction',
    );
  }

  async cancel(
    id: string,
    dto: CancelSiteExpenseVoucherDto,
    actorId: string,
  ) {
    const row = await this.requireVoucher(id);
    if (row.status === SiteExpenseVoucherStatus.Posted) {
      throw new BadRequestException(
        'Posted vouchers are immutable and cannot be cancelled',
      );
    }
    if (
      ![
        SiteExpenseVoucherStatus.Draft,
        SiteExpenseVoucherStatus.Submitted,
        SiteExpenseVoucherStatus.Verified,
        SiteExpenseVoucherStatus.Approved,
        SiteExpenseVoucherStatus.Returned,
      ].includes(row.status)
    ) {
      throw new BadRequestException('Voucher cannot be cancelled in this status');
    }
    row.status = SiteExpenseVoucherStatus.Cancelled;
    row.cancelledBy = new Types.ObjectId(actorId);
    row.cancelledAt = new Date();
    row.cancellationReason = dto.cancellationReason.trim();
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicSiteExpenseVoucher(row),
      'Site expense voucher cancelled',
    );
  }

  async getById(id: string) {
    const row = await this.requireVoucher(id);
    return createSuccessResponse(toPublicSiteExpenseVoucher(row));
  }

  async list(query: ListSiteExpenseVouchersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: FilterQuery<SiteExpenseVoucher> = {};
    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.pettyCashAccountId) {
      filter.pettyCashAccountId = new Types.ObjectId(query.pettyCashAccountId);
    }
    if (query.expenseCategoryId) {
      filter.expenseCategoryId = new Types.ObjectId(query.expenseCategoryId);
    }
    if (query.status) filter.status = query.status;

    const sort: Record<string, SortOrder> = { expenseDate: -1, createdAt: -1 };
    const [rows, total] = await Promise.all([
      this.voucherModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.voucherModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicSiteExpenseVoucher(r)),
      'Site expense vouchers',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ─── internals ─────────────────────────────────────────────────────────

  private assertEditable(row: SiteExpenseVoucher) {
    if (row.status === SiteExpenseVoucherStatus.Posted) {
      throw new BadRequestException('Posted vouchers are immutable');
    }
    if (!EDITABLE_STATUSES.includes(row.status)) {
      throw new BadRequestException(
        'Only draft or returned vouchers can be updated',
      );
    }
  }

  private normalizeAttachments(attachments?: SiteExpenseAttachmentDto[]) {
    return (attachments ?? []).map((a) => {
      if (!a.filePath?.trim() && !a.documentId) {
        throw new BadRequestException(
          'Each attachment requires filePath or documentId',
        );
      }
      return {
        type: a.type,
        fileName: a.fileName?.trim() || null,
        filePath: a.filePath?.trim() || null,
        documentId: a.documentId ? new Types.ObjectId(a.documentId) : null,
        mimeType: a.mimeType?.trim() || null,
      };
    });
  }

  private assertEvidenceRules(
    category: {
      requiresBill: boolean;
      requiresPhoto: boolean;
      requiresSignature: boolean;
    },
    attachments: Array<{ type: SiteExpenseAttachmentType }>,
  ) {
    const has = (type: SiteExpenseAttachmentType) =>
      attachments.some((a) => a.type === type);

    const missing: string[] = [];
    if (category.requiresBill && !has(SiteExpenseAttachmentType.Bill)) {
      missing.push('bill attachment');
    }
    if (category.requiresPhoto && !has(SiteExpenseAttachmentType.Photo)) {
      missing.push('photo attachment');
    }
    if (
      category.requiresSignature &&
      !has(SiteExpenseAttachmentType.Signature)
    ) {
      missing.push('signature attachment');
    }

    if (missing.length) {
      throw new BadRequestException(
        `Category evidence rules require: ${missing.join(', ')}`,
      );
    }
  }

  private async buildWarnings(input: {
    project: Project;
    expenseDate: Date;
    latitude: number | null;
    longitude: number | null;
    billNumber: string | null;
    amount: number;
    projectId: string;
    excludeVoucherId?: string;
  }): Promise<string[]> {
    const warnings: string[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expenseDay = new Date(input.expenseDate);
    expenseDay.setHours(0, 0, 0, 0);
    if (expenseDay.getTime() < today.getTime()) {
      warnings.push('Expense date is backdated');
    }

    if (
      input.latitude != null &&
      input.longitude != null &&
      input.project.latitude != null &&
      input.project.longitude != null
    ) {
      const radius =
        input.project.siteRadiusMeters ?? DEFAULT_SITE_RADIUS_METERS;
      const distanceM = haversineMeters(
        input.latitude,
        input.longitude,
        input.project.latitude,
        input.project.longitude,
      );
      if (distanceM - radius > 0.5) {
        warnings.push(
          `GPS is outside project radius (${Math.round(distanceM)}m > ${radius}m)`,
        );
      }
    }

    if (input.billNumber?.trim()) {
      const duplicates = await this.findPossibleDuplicateBills(
        input.projectId,
        input.billNumber.trim(),
        input.amount,
        input.excludeVoucherId,
      );
      if (duplicates.length > 0) {
        warnings.push(
          `Possible duplicate bill (${duplicates
            .map((d) => d.voucherNumber)
            .join(', ')})`,
        );
      }
    }

    return warnings;
  }

  private async findPossibleDuplicateBills(
    projectId: string,
    billNumber: string,
    amount: number,
    excludeVoucherId?: string,
  ) {
    const filter: FilterQuery<SiteExpenseVoucher> = {
      projectId: new Types.ObjectId(projectId),
      billNumber: new RegExp(
        `^${billNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        'i',
      ),
      status: {
        $in: [
          SiteExpenseVoucherStatus.Draft,
          SiteExpenseVoucherStatus.Submitted,
          SiteExpenseVoucherStatus.Verified,
          SiteExpenseVoucherStatus.Approved,
          SiteExpenseVoucherStatus.Posted,
        ],
      },
      amount: {
        $gte: amount - MONEY_EPS,
        $lte: amount + MONEY_EPS,
      },
    };
    if (excludeVoucherId) {
      filter._id = { $ne: new Types.ObjectId(excludeVoucherId) };
    }
    return this.voucherModel
      .find(filter)
      .select({ voucherNumber: 1 })
      .limit(5)
      .lean()
      .exec();
  }

  private async resolveDebitAccount(
    defaultLedgerAccountId: string | null,
    boqItemId: string | null,
  ): Promise<string> {
    if (boqItemId) {
      const wip = await this.accountModel
        .findOne({
          accountCategory: AccountCategory.WorkInProgress,
          status: AccountStatus.Active,
          allowManualPosting: true,
        })
        .sort({ accountCode: 1 })
        .exec();
      if (wip) {
        return String(wip._id);
      }
    }

    if (!defaultLedgerAccountId) {
      throw new BadRequestException(
        'Expense category has no defaultLedgerAccountId; configure it before posting',
      );
    }

    const account = await this.accountModel
      .findById(defaultLedgerAccountId)
      .exec();
    if (!account) {
      throw new BadRequestException('Default ledger account not found');
    }
    if (account.status !== AccountStatus.Active) {
      throw new BadRequestException('Default ledger account is inactive');
    }
    const isExpense = account.accountType === AccountType.Expense;
    const isWip =
      account.accountCategory === AccountCategory.WorkInProgress;
    if (!isExpense && !isWip) {
      throw new BadRequestException(
        'Debit account must be an expense or WIP account',
      );
    }
    return String(account._id);
  }

  private async requireActiveCategory(categoryId: string) {
    const res = await this.expenseCategoriesService.getById(categoryId);
    const category = res.data;
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }
    if (category.status !== ExpenseCategoryStatus.Active) {
      throw new BadRequestException('Expense category is inactive');
    }
    return category;
  }

  private async requirePettyCash(cashAccountId: string, projectId: string) {
    const res = await this.cashAccountsService.getById(cashAccountId);
    const cash = res.data;
    if (!cash) {
      throw new NotFoundException('Petty-cash account not found');
    }
    if (cash.kind !== CashAccountKind.PettyCash) {
      throw new BadRequestException(
        'pettyCashAccountId must be a petty-cash account',
      );
    }
    if (cash.status !== CashAccountStatus.Active) {
      throw new BadRequestException('Petty-cash account is not active');
    }
    if (String(cash.projectId) !== projectId) {
      throw new BadRequestException(
        'Petty-cash account belongs to a different project',
      );
    }
    return cash;
  }

  private async requireProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  private async requireVoucher(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Site expense voucher not found');
    }
    const row = await this.voucherModel.findById(id).exec();
    if (!row) {
      throw new NotFoundException('Site expense voucher not found');
    }
    return row;
  }
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
