import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Types } from 'mongoose';
import { createSuccessResponse } from '../../common/dto/api-response.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/schemas/audit-log.schema';
import {
  Account,
  AccountCategory,
  AccountStatus,
} from '../chart-of-accounts/schemas/account.schema';
import { CompanyBankAccount } from '../company-bank-accounts/schemas/company-bank-account.schema';
import { JournalService } from '../journal/journal.service';
import {
  JournalEntry,
  JournalStatus,
} from '../journal/schemas/journal-entry.schema';
import {
  BANK_RECON_DATE_TOLERANCE_DAYS,
  BankReconciliationAdjustmentType,
  BankReconciliationMatchCriterion,
  BankReconciliationMatchStatus,
  BankReconciliationMatchType,
  BankReconciliationSessionStatus,
  BankStatementLineStatus,
  type StatementColumnMapping,
} from './bank-reconciliation.constants';
import { BankStatementImportService } from './bank-statement-import.service';
import type {
  AutoMatchDto,
  CreateReconciliationSessionDto,
  ManualMatchDto,
  PostAdjustmentDto,
  StatementColumnMappingDto,
} from './dto/bank-reconciliation.dto';
import {
  BankReconciliationMatch,
  type BookLineSnapshot,
} from './schemas/bank-reconciliation-match.schema';
import { BankReconciliationSession } from './schemas/bank-reconciliation-session.schema';
import { BankStatementLine } from './schemas/bank-statement-line.schema';

const MODULE = 'bank_reconciliation';
const API = '/api/v1';

type BookCandidate = {
  journalId: Types.ObjectId;
  journalLineId: Types.ObjectId;
  journalNumber: string;
  journalDate: Date;
  debit: number;
  credit: number;
  narration: string;
  lineDescription: string | null;
  sourceModule: string | null;
  sourceEntityId: string | null;
  searchText: string;
};

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectModel(BankReconciliationSession.name)
    private readonly sessionModel: Model<BankReconciliationSession>,
    @InjectModel(BankStatementLine.name)
    private readonly lineModel: Model<BankStatementLine>,
    @InjectModel(BankReconciliationMatch.name)
    private readonly matchModel: Model<BankReconciliationMatch>,
    @InjectModel(CompanyBankAccount.name)
    private readonly bankModel: Model<CompanyBankAccount>,
    @InjectModel(JournalEntry.name)
    private readonly journalModel: Model<JournalEntry>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
    private readonly importService: BankStatementImportService,
    private readonly journalService: JournalService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createSession(dto: CreateReconciliationSessionDto, actorId: string) {
    const bank = await this.requireBank(dto.bankAccountId);
    const from = new Date(dto.statementFrom);
    const to = new Date(dto.statementTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid statement date range');
    }
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('statementFrom must be on or before statementTo');
    }

    const session = await this.sessionModel.create({
      sessionNumber: this.nextSessionNumber(),
      bankAccountId: bank._id,
      ledgerAccountId: bank.ledgerAccountId,
      statementFrom: from,
      statementTo: to,
      statementOpeningBalance: dto.statementOpeningBalance ?? 0,
      statementClosingBalance: dto.statementClosingBalance ?? 0,
      status: BankReconciliationSessionStatus.Draft,
      createdBy: new Types.ObjectId(actorId),
      notes: dto.notes?.trim() ?? null,
    });

    await this.audit(actorId, AuditAction.CREATE, 'bank_reconciliation_session', String(session._id), null, this.toPublicSession(session));

    return createSuccessResponse(
      this.toPublicSession(session),
      'Bank reconciliation session created',
    );
  }

  async listSessions(bankAccountId?: string) {
    const filter: FilterQuery<BankReconciliationSession> = {};
    if (bankAccountId) {
      if (!Types.ObjectId.isValid(bankAccountId)) {
        throw new BadRequestException('Invalid bankAccountId');
      }
      filter.bankAccountId = new Types.ObjectId(bankAccountId);
    }
    const rows = await this.sessionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((r) => this.toPublicSession(r)),
      'Bank reconciliation sessions',
    );
  }

  async getSession(sessionId: string) {
    const session = await this.requireSession(sessionId);
    const counts = await this.lineCounts(session._id as Types.ObjectId);
    return createSuccessResponse(
      { ...this.toPublicSession(session), ...counts },
      'Bank reconciliation session',
    );
  }

  async importStatement(
    sessionId: string,
    file: Express.Multer.File | undefined,
    mapping: StatementColumnMappingDto,
    actorId: string,
    replaceExisting = false,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Statement file is required');
    }
    const session = await this.requireEditableSession(sessionId);

    const parsed = await this.importService.parseBuffer(
      file.buffer,
      file.originalname ?? 'statement.xlsx',
      mapping,
    );

    if (replaceExisting) {
      await this.lineModel.deleteMany({ sessionId: session._id }).exec();
      await this.matchModel
        .updateMany(
          {
            sessionId: session._id,
            status: BankReconciliationMatchStatus.Active,
          },
          {
            $set: {
              status: BankReconciliationMatchStatus.Undone,
              undoneBy: new Types.ObjectId(actorId),
              undoneAt: new Date(),
              notes: 'Cleared by re-import',
            },
          },
        )
        .exec();
    } else {
      const existing = await this.lineModel
        .countDocuments({ sessionId: session._id })
        .exec();
      if (existing > 0) {
        throw new BadRequestException(
          'Session already has statement lines; pass replaceExisting=true to replace',
        );
      }
    }

    const docs = parsed.map((p) => ({
      sessionId: session._id,
      bankAccountId: session.bankAccountId,
      lineNumber: p.lineNumber,
      txnDate: p.txnDate,
      valueDate: p.valueDate,
      description: p.description,
      debit: p.debit,
      credit: p.credit,
      balance: p.balance,
      transactionId: p.transactionId,
      chequeNumber: p.chequeNumber,
      raw: p.raw,
      status: BankStatementLineStatus.Unmatched,
      matchId: null,
    }));

    await this.lineModel.insertMany(docs);
    session.columnMapping = mapping as StatementColumnMapping;
    session.sourceFileName = file.originalname ?? null;
    session.status = BankReconciliationSessionStatus.InProgress;
    await session.save();

    await this.audit(
      actorId,
      AuditAction.CREATE,
      'bank_statement_import',
      String(session._id),
      null,
      {
        fileName: file.originalname,
        lineCount: docs.length,
        columnMapping: mapping,
      },
    );

    return createSuccessResponse(
      {
        sessionId: String(session._id),
        importedCount: docs.length,
        fileName: file.originalname,
      },
      'Bank statement imported',
    );
  }

  async updateColumnMapping(
    sessionId: string,
    mapping: StatementColumnMappingDto,
    actorId: string,
  ) {
    const session = await this.requireEditableSession(sessionId);
    const before = session.columnMapping;
    session.columnMapping = mapping as StatementColumnMapping;
    await session.save();
    await this.audit(
      actorId,
      AuditAction.UPDATE,
      'bank_reconciliation_session',
      String(session._id),
      { columnMapping: before },
      { columnMapping: mapping },
    );
    return createSuccessResponse(
      this.toPublicSession(session),
      'Column mapping updated',
    );
  }

  async listStatementLines(
    sessionId: string,
    status?: BankStatementLineStatus,
  ) {
    await this.requireSession(sessionId);
    const filter: FilterQuery<BankStatementLine> = {
      sessionId: new Types.ObjectId(sessionId),
    };
    if (status) filter.status = status;
    const rows = await this.lineModel
      .find(filter)
      .sort({ txnDate: 1, lineNumber: 1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((r) => this.toPublicLine(r)),
      'Statement lines',
    );
  }

  async listUnmatched(sessionId: string) {
    const session = await this.requireSession(sessionId);
    const statement = await this.lineModel
      .find({
        sessionId: session._id,
        status: BankStatementLineStatus.Unmatched,
      })
      .sort({ txnDate: 1, lineNumber: 1 })
      .lean()
      .exec();

    const matchedBookIds = await this.activeMatchedBookLineIds(
      session._id as Types.ObjectId,
    );
    const book = await this.loadBookCandidates(session);
    const unmatchedBook = book.filter(
      (b) => !matchedBookIds.has(String(b.journalLineId)),
    );

    return createSuccessResponse(
      {
        statementLines: statement.map((r) => this.toPublicLine(r)),
        bookLines: unmatchedBook.map((b) => this.toPublicBook(b)),
        statementUnmatchedCount: statement.length,
        bookUnmatchedCount: unmatchedBook.length,
      },
      'Unmatched transactions',
    );
  }

  async autoMatch(sessionId: string, dto: AutoMatchDto, actorId: string) {
    const session = await this.requireEditableSession(sessionId);
    const tolerance =
      dto.dateToleranceDays ?? BANK_RECON_DATE_TOLERANCE_DAYS;

    const unmatched = await this.lineModel
      .find({
        sessionId: session._id,
        status: BankStatementLineStatus.Unmatched,
      })
      .sort({ txnDate: 1, lineNumber: 1 })
      .exec();

    const matchedBookIds = await this.activeMatchedBookLineIds(
      session._id as Types.ObjectId,
    );
    const book = (
      await this.loadBookCandidates(session)
    ).filter((b) => !matchedBookIds.has(String(b.journalLineId)));

    let matchCount = 0;
    const usedBook = new Set<string>();

    for (const line of unmatched) {
      const candidate = this.findAutoMatch(line, book, usedBook, tolerance);
      if (!candidate) continue;

      usedBook.add(String(candidate.book.journalLineId));
      await this.createMatch({
        session,
        statementLines: [line],
        bookLines: [candidate.book],
        matchType: BankReconciliationMatchType.Auto,
        criteria: candidate.criteria,
        actorId,
        notes: 'Auto-matched',
      });
      matchCount += 1;
    }

    await this.audit(
      actorId,
      AuditAction.UPDATE,
      'bank_reconciliation_auto_match',
      String(session._id),
      null,
      { matchCount, dateToleranceDays: tolerance },
    );

    return createSuccessResponse(
      { sessionId: String(session._id), matchCount },
      'Auto-match completed',
    );
  }

  async manualMatch(sessionId: string, dto: ManualMatchDto, actorId: string) {
    const session = await this.requireEditableSession(sessionId);

    const statementLines = await this.lineModel
      .find({
        _id: {
          $in: dto.statementLineIds.map((id) => new Types.ObjectId(id)),
        },
        sessionId: session._id,
      })
      .exec();
    if (statementLines.length !== dto.statementLineIds.length) {
      throw new BadRequestException('One or more statement lines not found');
    }
    if (
      statementLines.some((l) => l.status !== BankStatementLineStatus.Unmatched)
    ) {
      throw new BadRequestException('All statement lines must be unmatched');
    }

    const book = await this.loadBookCandidates(session);
    const bookByLine = new Map(
      book.map((b) => [String(b.journalLineId), b]),
    );
    const matchedBookIds = await this.activeMatchedBookLineIds(
      session._id as Types.ObjectId,
    );

    const selected: BookCandidate[] = [];
    for (const ref of dto.bookLines) {
      const b = bookByLine.get(ref.journalLineId);
      if (!b || String(b.journalId) !== ref.journalId) {
        throw new BadRequestException(
          `Book line ${ref.journalLineId} not found in session ledger`,
        );
      }
      if (matchedBookIds.has(ref.journalLineId)) {
        throw new BadRequestException(
          `Book line ${ref.journalLineId} is already matched`,
        );
      }
      selected.push(b);
    }

    const stmtDebit = this.round2(
      statementLines.reduce((s, l) => s + l.debit, 0),
    );
    const stmtCredit = this.round2(
      statementLines.reduce((s, l) => s + l.credit, 0),
    );
    const bookDebit = this.round2(selected.reduce((s, b) => s + b.debit, 0));
    const bookCredit = this.round2(selected.reduce((s, b) => s + b.credit, 0));
    if (stmtDebit !== bookCredit && stmtCredit !== bookDebit) {
      // Bank debit (withdrawal) matches book credit; bank credit matches book debit
      // Allow either direction equality of totals
      const bankNet = this.round2(stmtCredit - stmtDebit);
      const bookNet = this.round2(bookDebit - bookCredit);
      if (bankNet !== bookNet) {
        throw new BadRequestException(
          `Amounts do not reconcile (statement net ${bankNet} vs book net ${bookNet})`,
        );
      }
    }

    const match = await this.createMatch({
      session,
      statementLines,
      bookLines: selected,
      matchType: BankReconciliationMatchType.Manual,
      criteria: [BankReconciliationMatchCriterion.Composite],
      actorId,
      notes: dto.notes ?? null,
    });

    await this.audit(
      actorId,
      AuditAction.UPDATE,
      'bank_reconciliation_match',
      String(match._id),
      null,
      {
        sessionId: String(session._id),
        statementLineIds: dto.statementLineIds,
        bookLines: dto.bookLines,
        matchType: BankReconciliationMatchType.Manual,
      },
    );

    return createSuccessResponse(
      this.toPublicMatch(match),
      'Manual match created',
    );
  }

  async unmatch(sessionId: string, matchId: string, actorId: string) {
    const session = await this.requireEditableSession(sessionId);
    const match = await this.matchModel.findById(matchId).exec();
    if (!match || String(match.sessionId) !== String(session._id)) {
      throw new NotFoundException('Match not found');
    }
    if (match.status !== BankReconciliationMatchStatus.Active) {
      throw new BadRequestException('Match is already undone');
    }

    const before = this.toPublicMatch(match);
    match.status = BankReconciliationMatchStatus.Undone;
    match.undoneBy = new Types.ObjectId(actorId);
    match.undoneAt = new Date();
    await match.save();

    await this.lineModel
      .updateMany(
        { _id: { $in: match.statementLineIds } },
        {
          $set: {
            status: BankStatementLineStatus.Unmatched,
            matchId: null,
          },
        },
      )
      .exec();

    await this.audit(
      actorId,
      AuditAction.UPDATE,
      'bank_reconciliation_unmatch',
      String(match._id),
      before,
      this.toPublicMatch(match),
    );

    return createSuccessResponse(
      this.toPublicMatch(match),
      'Match undone (history retained)',
    );
  }

  async listMatches(sessionId: string) {
    await this.requireSession(sessionId);
    const rows = await this.matchModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ matchedAt: -1 })
      .lean()
      .exec();
    return createSuccessResponse(
      rows.map((r) => this.toPublicMatch(r)),
      'Reconciliation matches',
    );
  }

  async postAdjustment(
    sessionId: string,
    dto: PostAdjustmentDto,
    actorId: string,
  ) {
    const session = await this.requireEditableSession(sessionId);
    const bank = await this.requireBank(String(session.bankAccountId));
    const offsetAccountId = await this.resolveOffsetAccount(
      dto.adjustmentType,
      dto.offsetAccountId,
    );

    const amount = this.round2(dto.amount);
    const bankIsDebit =
      dto.adjustmentType === BankReconciliationAdjustmentType.InterestIncome;

    const lines = bankIsDebit
      ? [
          {
            accountId: String(bank.ledgerAccountId),
            debit: amount,
            credit: 0,
            description: dto.narration,
          },
          {
            accountId: offsetAccountId,
            debit: 0,
            credit: amount,
            description: dto.narration,
          },
        ]
      : [
          {
            accountId: offsetAccountId,
            debit: amount,
            credit: 0,
            description: dto.narration,
          },
          {
            accountId: String(bank.ledgerAccountId),
            debit: 0,
            credit: amount,
            description: dto.narration,
          },
        ];

    const journal = await this.journalService.create(
      {
        journalDate: dto.journalDate,
        projectId: bank.projectId ? String(bank.projectId) : null,
        sourceModule: 'bank_reconciliation',
        sourceEntityType: 'bank_reconciliation_session',
        sourceEntityId: String(session._id),
        narration: dto.narration,
        lines,
        post: true,
      },
      actorId,
      `bank-recon-adj:${session._id}:${dto.adjustmentType}:${dto.journalDate}:${amount}`,
    );

    const journalData = journal.data as {
      id: string;
      journalNumber: string;
    };

    let autoMatched: unknown = null;
    if (dto.statementLineId) {
      const line = await this.lineModel.findById(dto.statementLineId).exec();
      if (
        line &&
        String(line.sessionId) === String(session._id) &&
        line.status === BankStatementLineStatus.Unmatched
      ) {
        const bookLines = await this.loadBookCandidates(session);
        const bankLine = bookLines.find(
          (b) => String(b.journalId) === journalData.id,
        );
        if (bankLine) {
          const match = await this.createMatch({
            session,
            statementLines: [line],
            bookLines: [bankLine],
            matchType: BankReconciliationMatchType.Manual,
            criteria: [BankReconciliationMatchCriterion.Amount],
            actorId,
            notes: `Auto-linked to ${dto.adjustmentType} posting`,
          });
          autoMatched = this.toPublicMatch(match);
        }
      }
    }

    await this.audit(
      actorId,
      AuditAction.POST,
      'bank_reconciliation_adjustment',
      String(session._id),
      null,
      {
        adjustmentType: dto.adjustmentType,
        amount,
        journalId: journalData.id,
        journalNumber: journalData.journalNumber,
      },
    );

    return createSuccessResponse(
      {
        journalId: journalData.id,
        journalNumber: journalData.journalNumber,
        adjustmentType: dto.adjustmentType,
        amount,
        autoMatched,
      },
      'Adjustment posted',
    );
  }

  async getReconciliationStatement(sessionId: string) {
    const session = await this.requireSession(sessionId);
    const bank = await this.requireBank(String(session.bankAccountId));

    const lines = await this.lineModel
      .find({ sessionId: session._id })
      .lean()
      .exec();
    const matches = await this.matchModel
      .find({
        sessionId: session._id,
        status: BankReconciliationMatchStatus.Active,
      })
      .lean()
      .exec();

    const unmatchedStatement = lines.filter(
      (l) => l.status === BankStatementLineStatus.Unmatched,
    );
    const matchedBookIds = await this.activeMatchedBookLineIds(
      session._id as Types.ObjectId,
    );
    const book = await this.loadBookCandidates(session);
    const unmatchedBook = book.filter(
      (b) => !matchedBookIds.has(String(b.journalLineId)),
    );

    const bookBalance = await this.bookBalanceAsOf(
      bank.ledgerAccountId as Types.ObjectId,
      bank.openingBalance ?? 0,
      session.statementTo,
    );

    const unmatchedDeposits = this.round2(
      unmatchedStatement
        .filter((l) => l.credit > 0)
        .reduce((s, l) => s + l.credit, 0),
    );
    const unmatchedWithdrawals = this.round2(
      unmatchedStatement
        .filter((l) => l.debit > 0)
        .reduce((s, l) => s + l.debit, 0),
    );
    const outstandingCheques = this.round2(
      unmatchedBook
        .filter((b) => b.credit > 0)
        .reduce((s, b) => s + b.credit, 0),
    );
    const depositsInTransit = this.round2(
      unmatchedBook
        .filter((b) => b.debit > 0)
        .reduce((s, b) => s + b.debit, 0),
    );

    const adjustedBook = this.round2(
      bookBalance + unmatchedDeposits - unmatchedWithdrawals,
    );
    // Classic: bank statement + deposits in transit - outstanding cheques
    const adjustedBank = this.round2(
      session.statementClosingBalance +
        depositsInTransit -
        outstandingCheques,
    );

    const statement = {
      session: this.toPublicSession(session),
      bankAccount: {
        id: String(bank._id),
        accountCode: bank.accountCode,
        bankName: bank.bankName,
      },
      bookBalanceAsOfStatementTo: bookBalance,
      statementClosingBalance: session.statementClosingBalance,
      unmatchedStatementDeposits: unmatchedDeposits,
      unmatchedStatementWithdrawals: unmatchedWithdrawals,
      depositsInTransit,
      outstandingCheques,
      adjustedBookBalance: adjustedBook,
      adjustedBankBalance: adjustedBank,
      difference: this.round2(adjustedBank - adjustedBook),
      reconciled: this.round2(adjustedBank - adjustedBook) === 0,
      matchedCount: matches.length,
      unmatchedStatementCount: unmatchedStatement.length,
      unmatchedBookCount: unmatchedBook.length,
      unmatchedStatementLines: unmatchedStatement.map((l) =>
        this.toPublicLine(l),
      ),
      unmatchedBookLines: unmatchedBook.map((b) => this.toPublicBook(b)),
      matches: matches.map((m) => this.toPublicMatch(m)),
      drillDown: [
        {
          label: 'Bank ledger',
          href: `${API}/company-bank-accounts/${String(bank._id)}/ledger`,
        },
      ],
    };

    return createSuccessResponse(statement, 'Bank reconciliation statement');
  }

  async completeSession(sessionId: string, actorId: string) {
    const session = await this.requireEditableSession(sessionId);
    const statement = await this.getReconciliationStatement(sessionId);
    const data = statement.data as { reconciled: boolean; difference: number };

    session.status = BankReconciliationSessionStatus.Completed;
    session.completedBy = new Types.ObjectId(actorId);
    session.completedAt = new Date();
    await session.save();

    await this.audit(
      actorId,
      AuditAction.APPROVE,
      'bank_reconciliation_session',
      String(session._id),
      { status: BankReconciliationSessionStatus.InProgress },
      {
        status: BankReconciliationSessionStatus.Completed,
        reconciled: data.reconciled,
        difference: data.difference,
      },
    );

    return createSuccessResponse(
      {
        ...this.toPublicSession(session),
        reconciled: data.reconciled,
        difference: data.difference,
      },
      data.reconciled
        ? 'Reconciliation completed (balanced)'
        : 'Reconciliation completed with outstanding difference',
    );
  }

  // ─── matching helpers ──────────────────────────────────────────────────

  private findAutoMatch(
    line: BankStatementLine,
    book: BookCandidate[],
    usedBook: Set<string>,
    toleranceDays: number,
  ): {
    book: BookCandidate;
    criteria: BankReconciliationMatchCriterion[];
  } | null {
    const available = book.filter(
      (b) => !usedBook.has(String(b.journalLineId)),
    );

    if (line.transactionId) {
      const tid = line.transactionId.toLowerCase();
      const hit = available.find((b) => b.searchText.includes(tid));
      if (hit && this.amountsAlign(line, hit)) {
        return {
          book: hit,
          criteria: [
            BankReconciliationMatchCriterion.TransactionId,
            BankReconciliationMatchCriterion.Amount,
          ],
        };
      }
    }

    if (line.chequeNumber) {
      const chq = line.chequeNumber.toLowerCase();
      const byCheque = available.find(
        (b) => b.searchText.includes(chq) && this.amountsAlign(line, b),
      );
      if (byCheque) {
        return {
          book: byCheque,
          criteria: [
            BankReconciliationMatchCriterion.ChequeNumber,
            BankReconciliationMatchCriterion.Amount,
          ],
        };
      }
    }

    const amountHits = available.filter((b) => this.amountsAlign(line, b));
    const sameDay = amountHits.find(
      (b) => this.dayKey(b.journalDate) === this.dayKey(line.txnDate),
    );
    if (sameDay) {
      return {
        book: sameDay,
        criteria: [
          BankReconciliationMatchCriterion.Amount,
          BankReconciliationMatchCriterion.Date,
        ],
      };
    }

    const windowMs = toleranceDays * 24 * 60 * 60 * 1000;
    const near = amountHits.find(
      (b) =>
        Math.abs(b.journalDate.getTime() - line.txnDate.getTime()) <= windowMs,
    );
    if (near) {
      return {
        book: near,
        criteria: [
          BankReconciliationMatchCriterion.Amount,
          BankReconciliationMatchCriterion.Date,
        ],
      };
    }

    return null;
  }

  private amountsAlign(line: BankStatementLine, book: BookCandidate): boolean {
    // Statement credit (deposit) ↔ book debit; statement debit ↔ book credit
    if (line.credit > 0 && this.round2(book.debit) === this.round2(line.credit)) {
      return true;
    }
    if (line.debit > 0 && this.round2(book.credit) === this.round2(line.debit)) {
      return true;
    }
    return false;
  }

  private async createMatch(input: {
    session: BankReconciliationSession & { _id: Types.ObjectId };
    statementLines: Array<BankStatementLine & { _id: Types.ObjectId }>;
    bookLines: BookCandidate[];
    matchType: BankReconciliationMatchType;
    criteria: BankReconciliationMatchCriterion[];
    actorId: string;
    notes: string | null;
  }) {
    const snapshots: BookLineSnapshot[] = input.bookLines.map((b) => ({
      journalId: b.journalId,
      journalLineId: b.journalLineId,
      journalNumber: b.journalNumber,
      journalDate: b.journalDate,
      debit: b.debit,
      credit: b.credit,
      narration: b.narration,
      lineDescription: b.lineDescription,
      sourceModule: b.sourceModule,
      sourceEntityId: b.sourceEntityId,
    }));

    const statementLineIds = input.statementLines.map((l) => l._id);
    const match = await this.matchModel.create({
      sessionId: input.session._id,
      statementLineIds,
      bookLines: snapshots,
      matchType: input.matchType,
      criteria: input.criteria,
      status: BankReconciliationMatchStatus.Active,
      matchedBy: new Types.ObjectId(input.actorId),
      matchedAt: new Date(),
      notes: input.notes,
    });

    await this.lineModel
      .updateMany(
        { _id: { $in: statementLineIds } },
        {
          $set: {
            status: BankStatementLineStatus.Matched,
            matchId: match._id,
          },
        },
      )
      .exec();

    return match;
  }

  private async loadBookCandidates(
    session: BankReconciliationSession,
  ): Promise<BookCandidate[]> {
    const rows = await this.journalModel
      .aggregate<{
        journalId: Types.ObjectId;
        journalNumber: string;
        journalDate: Date;
        narration: string;
        sourceModule: string | null;
        sourceEntityId: string | null;
        lineId: Types.ObjectId;
        debit: number;
        credit: number;
        description: string | null;
      }>([
        {
          $match: {
            status: JournalStatus.Posted,
            journalDate: {
              $gte: session.statementFrom,
              $lte: session.statementTo,
            },
            'lines.accountId': session.ledgerAccountId,
          },
        },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': session.ledgerAccountId } },
        {
          $project: {
            journalId: '$_id',
            journalNumber: 1,
            journalDate: 1,
            narration: 1,
            sourceModule: 1,
            sourceEntityId: 1,
            lineId: '$lines._id',
            debit: '$lines.debit',
            credit: '$lines.credit',
            description: '$lines.description',
          },
        },
        { $sort: { journalDate: 1, journalNumber: 1 } },
      ])
      .exec();

    return rows.map((r) => ({
      journalId: r.journalId,
      journalLineId: r.lineId,
      journalNumber: r.journalNumber,
      journalDate: new Date(r.journalDate),
      debit: r.debit ?? 0,
      credit: r.credit ?? 0,
      narration: r.narration,
      lineDescription: r.description ?? null,
      sourceModule: r.sourceModule ?? null,
      sourceEntityId: r.sourceEntityId ?? null,
      searchText: `${r.narration ?? ''} ${r.description ?? ''} ${r.sourceEntityId ?? ''}`.toLowerCase(),
    }));
  }

  private async activeMatchedBookLineIds(
    sessionId: Types.ObjectId,
  ): Promise<Set<string>> {
    const matches = await this.matchModel
      .find({
        sessionId,
        status: BankReconciliationMatchStatus.Active,
      })
      .select('bookLines.journalLineId')
      .lean()
      .exec();
    const set = new Set<string>();
    for (const m of matches) {
      for (const b of m.bookLines ?? []) {
        set.add(String(b.journalLineId));
      }
    }
    return set;
  }

  private async bookBalanceAsOf(
    ledgerAccountId: Types.ObjectId,
    openingBalance: number,
    asOf: Date,
  ): Promise<number> {
    const [agg] = await this.journalModel
      .aggregate<{ debit: number; credit: number }>([
        {
          $match: {
            status: JournalStatus.Posted,
            journalDate: { $lte: asOf },
            'lines.accountId': ledgerAccountId,
          },
        },
        { $unwind: '$lines' },
        { $match: { 'lines.accountId': ledgerAccountId } },
        {
          $group: {
            _id: null,
            debit: { $sum: '$lines.debit' },
            credit: { $sum: '$lines.credit' },
          },
        },
      ])
      .exec();
    return this.round2(
      openingBalance + (agg?.debit ?? 0) - (agg?.credit ?? 0),
    );
  }

  private async resolveOffsetAccount(
    type: BankReconciliationAdjustmentType,
    overrideId?: string,
  ): Promise<string> {
    if (overrideId) {
      if (!Types.ObjectId.isValid(overrideId)) {
        throw new BadRequestException('Invalid offsetAccountId');
      }
      const acc = await this.accountModel.findById(overrideId).lean().exec();
      if (!acc || acc.status !== AccountStatus.Active) {
        throw new BadRequestException('Offset account not found or inactive');
      }
      return String(acc._id);
    }

    let category: AccountCategory;
    let preferredCode: string | null = null;
    if (type === BankReconciliationAdjustmentType.InterestIncome) {
      category = AccountCategory.Interest;
      preferredCode = '4300';
    } else if (type === BankReconciliationAdjustmentType.InterestExpense) {
      category = AccountCategory.Interest;
      preferredCode = '5400';
    } else {
      category = AccountCategory.IndirectExpense;
      preferredCode = '5200';
    }

    if (preferredCode) {
      const byCode = await this.accountModel
        .findOne({
          accountCode: preferredCode,
          status: AccountStatus.Active,
        })
        .lean()
        .exec();
      if (byCode) return String(byCode._id);
    }

    const byCat = await this.accountModel
      .findOne({
        accountCategory: category,
        status: AccountStatus.Active,
        isControlAccount: false,
      })
      .lean()
      .exec();
    if (!byCat) {
      throw new BadRequestException(
        `No active ${category} account found for ${type}; pass offsetAccountId`,
      );
    }
    return String(byCat._id);
  }

  // ─── guards / mappers ──────────────────────────────────────────────────

  private async requireBank(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid bankAccountId');
    }
    const bank = await this.bankModel.findById(id).exec();
    if (!bank) throw new NotFoundException('Bank account not found');
    return bank;
  }

  private async requireSession(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid sessionId');
    }
    const session = await this.sessionModel.findById(id).exec();
    if (!session) throw new NotFoundException('Reconciliation session not found');
    return session;
  }

  private async requireEditableSession(id: string) {
    const session = await this.requireSession(id);
    if (
      session.status === BankReconciliationSessionStatus.Completed ||
      session.status === BankReconciliationSessionStatus.Cancelled
    ) {
      throw new BadRequestException('Session is locked');
    }
    return session;
  }

  private async lineCounts(sessionId: Types.ObjectId) {
    const [total, unmatched, matched] = await Promise.all([
      this.lineModel.countDocuments({ sessionId }).exec(),
      this.lineModel
        .countDocuments({
          sessionId,
          status: BankStatementLineStatus.Unmatched,
        })
        .exec(),
      this.lineModel
        .countDocuments({
          sessionId,
          status: BankStatementLineStatus.Matched,
        })
        .exec(),
    ]);
    return { lineCount: total, unmatchedCount: unmatched, matchedCount: matched };
  }

  private nextSessionNumber(): string {
    return `BR-${new Types.ObjectId().toHexString().slice(-10).toUpperCase()}`;
  }

  private async audit(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    beforeData: unknown,
    afterData: unknown,
  ) {
    await this.auditLogService.record({
      userId: actorId,
      action,
      module: MODULE,
      entityType,
      entityId,
      beforeData: beforeData as Record<string, unknown> | null,
      afterData: afterData as Record<string, unknown> | null,
    });
  }

  private toPublicSession(
    row:
      | BankReconciliationSession
      | (BankReconciliationSession & { _id: Types.ObjectId }),
  ) {
    const r = row as BankReconciliationSession & {
      _id: Types.ObjectId;
      toObject?: () => BankReconciliationSession;
    };
    const o = typeof r.toObject === 'function' ? r.toObject() : r;
    return {
      id: String(r._id),
      sessionNumber: o.sessionNumber,
      bankAccountId: String(o.bankAccountId),
      ledgerAccountId: String(o.ledgerAccountId),
      statementFrom: new Date(o.statementFrom).toISOString(),
      statementTo: new Date(o.statementTo).toISOString(),
      statementOpeningBalance: o.statementOpeningBalance,
      statementClosingBalance: o.statementClosingBalance,
      columnMapping: o.columnMapping,
      sourceFileName: o.sourceFileName,
      status: o.status,
      notes: o.notes,
      completedAt: o.completedAt
        ? new Date(o.completedAt).toISOString()
        : null,
    };
  }

  private toPublicLine(
    row: BankStatementLine | (BankStatementLine & { _id: Types.ObjectId }),
  ) {
    const r = row as BankStatementLine & { _id: Types.ObjectId };
    return {
      id: String(r._id),
      sessionId: String(r.sessionId),
      lineNumber: r.lineNumber,
      txnDate: new Date(r.txnDate).toISOString(),
      description: r.description,
      debit: r.debit,
      credit: r.credit,
      balance: r.balance,
      transactionId: r.transactionId,
      chequeNumber: r.chequeNumber,
      status: r.status,
      matchId: r.matchId ? String(r.matchId) : null,
      drillDown: r.matchId
        ? [
            {
              label: 'Match',
              href: `${API}/bank-reconciliation/sessions/${String(r.sessionId)}/matches`,
            },
          ]
        : [],
    };
  }

  private toPublicBook(b: BookCandidate) {
    return {
      journalId: String(b.journalId),
      journalLineId: String(b.journalLineId),
      journalNumber: b.journalNumber,
      journalDate: b.journalDate.toISOString(),
      debit: b.debit,
      credit: b.credit,
      narration: b.narration,
      lineDescription: b.lineDescription,
      sourceModule: b.sourceModule,
      sourceEntityId: b.sourceEntityId,
      drillDown: [
        {
          label: `Journal ${b.journalNumber}`,
          href: `${API}/journals/${String(b.journalId)}`,
        },
      ],
    };
  }

  private toPublicMatch(
    row:
      | BankReconciliationMatch
      | (BankReconciliationMatch & { _id: Types.ObjectId }),
  ) {
    const r = row as BankReconciliationMatch & { _id: Types.ObjectId };
    return {
      id: String(r._id),
      sessionId: String(r.sessionId),
      statementLineIds: (r.statementLineIds ?? []).map((id) => String(id)),
      bookLines: (r.bookLines ?? []).map((b) => ({
        journalId: String(b.journalId),
        journalLineId: String(b.journalLineId),
        journalNumber: b.journalNumber,
        journalDate: new Date(b.journalDate).toISOString(),
        debit: b.debit,
        credit: b.credit,
        narration: b.narration,
        lineDescription: b.lineDescription,
        sourceModule: b.sourceModule,
        sourceEntityId: b.sourceEntityId,
      })),
      matchType: r.matchType,
      criteria: r.criteria,
      status: r.status,
      matchedAt: new Date(r.matchedAt).toISOString(),
      undoneAt: r.undoneAt ? new Date(r.undoneAt).toISOString() : null,
      notes: r.notes,
    };
  }

  private dayKey(d: Date): string {
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);
  }

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
}
