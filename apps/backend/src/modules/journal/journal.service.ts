import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, FilterQuery, Model, SortOrder } from 'mongoose';
import { Types } from 'mongoose';
import {
  type ApiResponseDto,
  createSuccessResponse,
} from '../../common/dto/api-response.dto';
import { buildPaginationMeta } from '../../common/dto/pagination-query.dto';
import {
  JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
  IdempotencyService,
} from '../../database/services/idempotency.service';
import { DatabaseService } from '../../database/services/database.service';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ChartOfAccountsService } from '../chart-of-accounts/chart-of-accounts.service';
import type { Account } from '../chart-of-accounts/schemas/account.schema';
import { FinancialYearService } from '../financial-year/financial-year.service';
import { NumberEntityType } from '../numbering/numbering.constants';
import { NumberingService } from '../numbering/numbering.service';
import { ProjectScopedDataHelper } from '../project-access/project-scoped-data.helper';
import type {
  CancelJournalDto,
  CreateJournalDto,
  ListJournalsQueryDto,
  ReverseJournalDto,
  UpdateJournalDto,
} from './dto/journal.dto';
import {
  type PublicJournalEntry,
  toPublicJournal,
} from './journal.mapper';
import {
  type NormalizedJournalLine,
  validateAndNormalizeLines,
} from './journal.validation';
import {
  JournalEntry,
  JournalFundingSource,
  JournalPartyType,
  JournalStatus,
  type JournalLine,
} from './schemas/journal-entry.schema';

@Injectable()
export class JournalService {
  constructor(
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    private readonly numberingService: NumberingService,
    private readonly financialYearService: FinancialYearService,
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly databaseService: DatabaseService,
    private readonly idempotencyService: IdempotencyService,
    private readonly auditLogService: AuditLogService,
    private readonly projectScope: ProjectScopedDataHelper,
  ) {}

  async create(
    dto: CreateJournalDto,
    actorId: string,
    idempotencyKey?: string | null,
    session?: ClientSession | null,
  ) {
    await this.projectScope.assertOptionalProjectAccess(
      actorId,
      dto.projectId,
      'create',
      { resourceType: 'journal' },
    );
    const requestHash = this.idempotencyService.hashRequest({
      ...dto,
      actorId,
    });

    if (idempotencyKey && !session) {
      const begin = await this.idempotencyService.begin({
        key: idempotencyKey,
        scope: JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
        userId: actorId,
        requestHash,
      });
      if (begin.outcome === 'replay') {
        return begin.response as unknown as ApiResponseDto<PublicJournalEntry>;
      }
    }

    try {
      const { lines, totalDebit, totalCredit } = validateAndNormalizeLines(
        dto.lines,
      );
      await this.assertLineAccountsAndDimensions(lines, dto.projectId ?? null);

      const journalDate = new Date(dto.journalDate);
      const fy = await this.resolveFinancialYearForDate(journalDate);

      if (idempotencyKey) {
        const dupQuery = this.journalModel.findOne({
          idempotencyKey: idempotencyKey.trim(),
        });
        if (session) dupQuery.session(session);
        const dup = await dupQuery.lean().exec();
        if (dup) {
          if (
            session &&
            (dup.status === JournalStatus.Posted ||
              dup.status === JournalStatus.Draft)
          ) {
            if (dup.status === JournalStatus.Draft && dto.post) {
              return this.post(String(dup._id), actorId, session);
            }
            return createSuccessResponse(
              toPublicJournal(dup as Parameters<typeof toPublicJournal>[0]),
              'Journal entry already exists for idempotency key',
            );
          }
          throw new ConflictException(
            'A journal with this idempotency key already exists',
          );
        }
      }

      const journalNumber = await this.numberingService.nextCode(
        NumberEntityType.JOURNAL_ENTRY,
        {
          asOf: journalDate,
          projectId: dto.projectId ?? undefined,
          projectScoped: Boolean(dto.projectId),
        },
        session ?? undefined,
      );

      const payload = {
        journalNumber,
        journalDate,
        financialYearId: new Types.ObjectId(fy.id),
        projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : null,
        sourceModule: dto.sourceModule?.trim().toLowerCase() ?? 'manual',
        sourceEntityType:
          dto.sourceEntityType?.trim().toLowerCase() ?? 'manual_journal',
        sourceEntityId: dto.sourceEntityId ?? null,
        postingPurpose: dto.postingPurpose?.trim().toLowerCase() || null,
        narration: dto.narration.trim(),
        status: JournalStatus.Draft,
        totalDebit,
        totalCredit,
        postedAt: null,
        postedBy: null,
        reversalOf: null,
        reversedBy: null,
        idempotencyKey: idempotencyKey?.trim() ?? null,
        lines: this.toEmbeddedLines(lines),
        createdBy: new Types.ObjectId(actorId),
      };

      const row = session
        ? (
            await this.journalModel.create([payload], { session })
          )[0]
        : await this.journalModel.create(payload);

      let response = createSuccessResponse(
        toPublicJournal(row),
        'Journal entry created as draft',
      );

      if (dto.post) {
        response = await this.post(String(row._id), actorId, session);
      }

      if (idempotencyKey && !session) {
        await this.idempotencyService.complete(
          idempotencyKey,
          JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
          response as unknown as Record<string, unknown>,
        );
      }

      return response;
    } catch (error) {
      if (idempotencyKey && !session) {
        await this.idempotencyService.fail(
          idempotencyKey,
          JOURNAL_ENTRY_IDEMPOTENCY_SCOPE,
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateJournalDto, actorId: string) {
    const row = await this.requireJournal(id, null, actorId, 'update');
    this.assertMutable(row);

    if (dto.narration !== undefined) {
      row.narration = dto.narration.trim();
    }
    if (dto.projectId !== undefined) {
      row.projectId = dto.projectId
        ? new Types.ObjectId(dto.projectId)
        : null;
    }
    if (dto.journalDate !== undefined) {
      const journalDate = new Date(dto.journalDate);
      const fy = await this.resolveFinancialYearForDate(journalDate);
      row.journalDate = journalDate;
      row.financialYearId = new Types.ObjectId(fy.id);
    }
    if (dto.lines) {
      const { lines, totalDebit, totalCredit } = validateAndNormalizeLines(
        dto.lines,
      );
      await this.assertLineAccountsAndDimensions(
        lines,
        row.projectId ? String(row.projectId) : null,
      );
      row.lines = this.toEmbeddedLines(lines) as JournalLine[];
      row.totalDebit = totalDebit;
      row.totalCredit = totalCredit;
    }

    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(toPublicJournal(row), 'Journal entry updated');
  }

  async submitForApproval(id: string, actorId: string) {
    const row = await this.requireJournal(id, null, actorId, 'update');
    if (row.status !== JournalStatus.Draft) {
      throw new BadRequestException(
        'Only draft journals can be submitted for approval',
      );
    }
    validateAndNormalizeLines(
      row.lines.map((l) => ({
        accountId: String(l.accountId),
        debit: l.debit,
        credit: l.credit,
        projectId: l.projectId ? String(l.projectId) : null,
        partyType: l.partyType,
        partyId: l.partyId ? String(l.partyId) : null,
      })),
    );
    await this.assertLineAccountsAndDimensions(
      this.fromEmbeddedLines(row.lines),
      row.projectId ? String(row.projectId) : null,
    );

    row.status = JournalStatus.PendingApproval;
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicJournal(row),
      'Journal submitted for approval',
    );
  }

  async post(
    id: string,
    actorId: string,
    session?: ClientSession | null,
  ) {
    const run = async (txnSession: ClientSession) => {
      const row = await this.requireJournal(id, txnSession, actorId, 'update');
      if (row.status === JournalStatus.Posted) {
        return createSuccessResponse(
          toPublicJournal(row),
          'Journal entry already posted',
        );
      }
      if (
        row.status !== JournalStatus.Draft &&
        row.status !== JournalStatus.PendingApproval
      ) {
        throw new BadRequestException(
          'Only draft or pending-approval journals can be posted',
        );
      }

      const normalized = this.fromEmbeddedLines(row.lines);
      const { totalDebit, totalCredit } = validateAndNormalizeLines(normalized);
      row.totalDebit = totalDebit;
      row.totalCredit = totalCredit;

      await this.assertLineAccountsAndDimensions(
        normalized,
        row.projectId ? String(row.projectId) : null,
      );

      await this.financialYearService.assertPostingAllowed(row.journalDate);

      const now = new Date();
      row.status = JournalStatus.Posted;
      row.postedAt = now;
      row.postedBy = new Types.ObjectId(actorId);
      row.set('updatedBy', new Types.ObjectId(actorId));
      await row.save({ session: txnSession });

      const accountIds = [
        ...new Set(normalized.map((l) => l.accountId)),
      ];
      for (const accountId of accountIds) {
        await this.chartOfAccountsService.incrementPostingCount(
          accountId,
          1,
          txnSession,
        );
      }

      const publicRow = toPublicJournal(row);
      await this.auditLogService.record({
        userId: actorId,
        action: AuditAction.POST,
        module: 'journal',
        entityType: 'journal_entry',
        entityId: String(row._id),
        projectId: row.projectId ? String(row.projectId) : null,
        afterData: publicRow,
      });

      return createSuccessResponse(publicRow, 'Journal entry posted');
    };

    if (session) {
      return run(session);
    }
    return this.databaseService.withTransaction(async (txnSession) =>
      run(txnSession),
    );
  }

  async reverse(id: string, actorId: string, dto: ReverseJournalDto = {}) {
    return this.databaseService.withTransaction(async (session) => {
      const original = await this.requireJournal(id, session, actorId, 'update');
      if (
        original.status === JournalStatus.Reversed ||
        original.reversedBy
      ) {
        throw new ConflictException('Journal has already been reversed');
      }
      if (original.status !== JournalStatus.Posted) {
        throw new BadRequestException('Only posted journals can be reversed');
      }

      const reversalDate = dto.journalDate
        ? new Date(dto.journalDate)
        : original.journalDate;
      const fy = await this.financialYearService.assertPostingAllowed(
        reversalDate,
      );

      const swapped = this.fromEmbeddedLines(original.lines).map((line) => ({
        ...line,
        debit: line.credit,
        credit: line.debit,
      }));
      const { lines, totalDebit, totalCredit } =
        validateAndNormalizeLines(swapped);
      await this.assertLineAccountsAndDimensions(
        lines,
        original.projectId ? String(original.projectId) : null,
      );

      const journalNumber = await this.numberingService.nextCode(
        NumberEntityType.JOURNAL_ENTRY,
        {
          asOf: reversalDate,
          projectId: original.projectId
            ? String(original.projectId)
            : undefined,
          projectScoped: Boolean(original.projectId),
        },
        session,
      );

      const now = new Date();
      const [reversal] = await this.journalModel.create(
        [
          {
            journalNumber,
            journalDate: reversalDate,
            financialYearId: new Types.ObjectId(fy.id),
            projectId: original.projectId,
            sourceModule: 'journal',
            sourceEntityType: 'journal_reversal',
            sourceEntityId: String(original._id),
            narration:
              dto.narration?.trim() ||
              `Reversal of ${original.journalNumber}: ${original.narration}`,
            status: JournalStatus.Posted,
            totalDebit,
            totalCredit,
            postedAt: now,
            postedBy: new Types.ObjectId(actorId),
            reversalOf: original._id,
            reversedBy: null,
            idempotencyKey: null,
            lines: this.toEmbeddedLines(lines),
            createdBy: new Types.ObjectId(actorId),
          },
        ],
        { session },
      );

      original.status = JournalStatus.Reversed;
      original.reversedBy = reversal._id as Types.ObjectId;
      original.set('updatedBy', new Types.ObjectId(actorId));
      await original.save({ session });

      const accountIds = [...new Set(lines.map((l) => l.accountId))];
      for (const accountId of accountIds) {
        await this.chartOfAccountsService.incrementPostingCount(
          accountId,
          1,
          session,
        );
      }

      const publicReversal = toPublicJournal(reversal);
      await this.auditLogService.record({
        userId: actorId,
        action: AuditAction.REVERSE,
        module: 'journal',
        entityType: 'journal_entry',
        entityId: String(original._id),
        projectId: original.projectId ? String(original.projectId) : null,
        beforeData: toPublicJournal(original),
        afterData: publicReversal,
      });

      return createSuccessResponse(
        {
          original: toPublicJournal(original),
          reversal: publicReversal,
        },
        'Journal entry reversed',
      );
    });
  }

  async cancel(id: string, actorId: string, dto: CancelJournalDto = {}) {
    const row = await this.requireJournal(id, null, actorId, 'update');
    if (
      row.status !== JournalStatus.Draft &&
      row.status !== JournalStatus.PendingApproval
    ) {
      throw new BadRequestException(
        'Only draft or pending-approval journals can be cancelled',
      );
    }
    row.status = JournalStatus.Cancelled;
    if (dto.reason?.trim()) {
      row.narration = `${row.narration} [Cancelled: ${dto.reason.trim()}]`;
    }
    row.set('updatedBy', new Types.ObjectId(actorId));
    await row.save();
    return createSuccessResponse(
      toPublicJournal(row),
      'Journal entry cancelled',
    );
  }

  async getById(id: string, actorId: string) {
    const row = await this.requireJournal(id, null, actorId, 'read');
    return createSuccessResponse(toPublicJournal(row));
  }

  async list(query: ListJournalsQueryDto, actorId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    let filter: FilterQuery<JournalEntry> = {};

    if (query.status) filter.status = query.status;
    if (query.projectId) {
      await this.projectScope.assertProjectAccess(
        actorId,
        query.projectId,
        'read',
        { resourceType: 'journal' },
      );
      filter.projectId = new Types.ObjectId(query.projectId);
    }
    if (query.financialYearId) {
      filter.financialYearId = new Types.ObjectId(query.financialYearId);
    }
    if (query.sourceModule) {
      filter.sourceModule = query.sourceModule.trim().toLowerCase();
    }
    if (query.from || query.to) {
      filter.journalDate = {};
      if (query.from) {
        (filter.journalDate as Record<string, Date>).$gte = new Date(
          query.from,
        );
      }
      if (query.to) {
        (filter.journalDate as Record<string, Date>).$lte = new Date(query.to);
      }
    }

    filter = await this.projectScope.mergeAuthorisedProjectFilter(
      actorId,
      filter,
    );

    const sort: Record<string, SortOrder> = { journalDate: -1, createdAt: -1 };
    const [rows, total] = await Promise.all([
      this.journalModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.journalModel.countDocuments(filter).exec(),
    ]);

    return createSuccessResponse(
      rows.map((r) => toPublicJournal(r)),
      'Journal entries',
      buildPaginationMeta(page, limit, total),
    );
  }

  // ─── internals ─────────────────────────────────────────────────────────

  /** Assign FY for drafts without enforcing lock (lock enforced on post/reverse). */
  private async resolveFinancialYearForDate(journalDate: Date) {
    const result = await this.financialYearService.resolveTransactionDate(
      journalDate,
      { forPosting: false },
    );
    if (!result.valid || !result.financialYear) {
      throw new BadRequestException(
        result.reason ?? 'No financial year covers this journal date',
      );
    }
    return result.financialYear;
  }

  private assertMutable(row: JournalEntry) {
    if (row.status === JournalStatus.Posted) {
      throw new BadRequestException(
        'Posted journals are immutable; create a reversal to correct',
      );
    }
    if (row.status === JournalStatus.Reversed) {
      throw new BadRequestException('Reversed journals are immutable');
    }
    if (row.status === JournalStatus.Cancelled) {
      throw new BadRequestException('Cancelled journals cannot be edited');
    }
  }

  private async assertLineAccountsAndDimensions(
    lines: NormalizedJournalLine[],
    headerProjectId: string | null,
  ) {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const label = `Line ${i + 1}`;
      const account = await this.chartOfAccountsService.assertAllowsManualPosting(
        line.accountId,
      );
      this.assertRequiredDimensions(account, line, headerProjectId, label);
    }
  }

  private assertRequiredDimensions(
    account: Account,
    line: NormalizedJournalLine,
    headerProjectId: string | null,
    label: string,
  ) {
    const projectId = line.projectId ?? headerProjectId;
    if (account.requiresProject && !projectId) {
      throw new BadRequestException(
        `${label}: account ${account.accountCode} requires a project`,
      );
    }
    if (account.requiresParty && !line.partyId) {
      throw new BadRequestException(
        `${label}: account ${account.accountCode} requires a party`,
      );
    }
    if (line.partyId && !line.partyType) {
      throw new BadRequestException(
        `${label}: partyType is required when partyId is set`,
      );
    }
  }

  private toEmbeddedLines(lines: NormalizedJournalLine[]) {
    return lines.map((line) => ({
      accountId: new Types.ObjectId(line.accountId),
      debit: line.debit,
      credit: line.credit,
      projectId: line.projectId
        ? new Types.ObjectId(line.projectId)
        : null,
      blockId: line.blockId ? new Types.ObjectId(line.blockId) : null,
      costCentreId: line.costCentreId
        ? new Types.ObjectId(line.costCentreId)
        : null,
      boqItemId: line.boqItemId ? new Types.ObjectId(line.boqItemId) : null,
      partyType: (line.partyType as JournalPartyType | null) ?? null,
      partyId: line.partyId ? new Types.ObjectId(line.partyId) : null,
      fundingSource:
        (line.fundingSource as JournalFundingSource | null) ?? null,
      description: line.description,
    }));
  }

  private fromEmbeddedLines(
    lines: JournalLine[],
  ): NormalizedJournalLine[] {
    return lines.map((line) => ({
      accountId: String(line.accountId),
      debit: line.debit,
      credit: line.credit,
      projectId: line.projectId ? String(line.projectId) : null,
      blockId: line.blockId ? String(line.blockId) : null,
      costCentreId: line.costCentreId ? String(line.costCentreId) : null,
      boqItemId: line.boqItemId ? String(line.boqItemId) : null,
      partyType: line.partyType ?? null,
      partyId: line.partyId ? String(line.partyId) : null,
      fundingSource: line.fundingSource ?? null,
      description: line.description ?? null,
    }));
  }

  private async requireJournal(
    id: string,
    session?: ClientSession | null,
    actorId?: string,
    action: 'read' | 'update' | 'create' | 'approve' = 'read',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Journal entry not found');
    }
    const q = this.journalModel.findById(id);
    if (session) q.session(session);
    const row = await q.exec();
    if (!row) {
      throw new NotFoundException('Journal entry not found');
    }
    if (actorId) {
      await this.projectScope.assertOptionalProjectAccess(
        actorId,
        row.projectId ? String(row.projectId) : null,
        action,
        { resourceType: 'journal', resourceId: id },
      );
    }
    return row;
  }
}
