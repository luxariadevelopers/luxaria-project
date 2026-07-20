import type { ApiResponse } from '@luxaria/shared-types';
import { apiClient, apiGet, apiPatch, apiPost } from '@/api/client';
import type {
  AutoMatchInput,
  AutoMatchResult,
  CreateReconciliationSessionInput,
  ImportStatementInput,
  ImportStatementResult,
  ListSessionsQuery,
  ManualMatchInput,
  PostAdjustmentInput,
  PublicBankReconciliationMatch,
  PublicBankReconciliationSession,
  PublicBankStatementLine,
  ReconciliationStatement,
  StatementColumnMapping,
  UnmatchedPayload,
  BankStatementLineStatus,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseSession(
  row: PublicBankReconciliationSession,
): PublicBankReconciliationSession {
  return {
    ...row,
    statementFrom: toIso(row.statementFrom) ?? row.statementFrom,
    statementTo: toIso(row.statementTo) ?? row.statementTo,
    completedAt: toIso(row.completedAt),
    columnMapping: row.columnMapping ?? null,
    sourceFileName: row.sourceFileName ?? null,
    notes: row.notes ?? null,
  };
}

function normaliseLine(row: PublicBankStatementLine): PublicBankStatementLine {
  return {
    ...row,
    txnDate: toIso(row.txnDate) ?? row.txnDate,
    balance: row.balance ?? null,
    transactionId: row.transactionId ?? null,
    chequeNumber: row.chequeNumber ?? null,
    matchId: row.matchId ?? null,
    drillDown: row.drillDown ?? [],
  };
}

function normaliseBook(
  row: UnmatchedPayload['bookLines'][number],
): UnmatchedPayload['bookLines'][number] {
  return {
    ...row,
    journalDate: toIso(row.journalDate) ?? row.journalDate,
    lineDescription: row.lineDescription ?? null,
    sourceModule: row.sourceModule ?? null,
    sourceEntityId: row.sourceEntityId ?? null,
    drillDown: row.drillDown ?? [],
  };
}

function normaliseMatch(
  row: PublicBankReconciliationMatch,
): PublicBankReconciliationMatch {
  return {
    ...row,
    matchedAt: toIso(row.matchedAt) ?? row.matchedAt,
    undoneAt: toIso(row.undoneAt),
    notes: row.notes ?? null,
    statementLineIds: row.statementLineIds ?? [],
    bookLines: (row.bookLines ?? []).map((b) => ({
      ...b,
      journalDate: toIso(b.journalDate) ?? b.journalDate,
      lineDescription: b.lineDescription ?? null,
      sourceModule: b.sourceModule ?? null,
      sourceEntityId: b.sourceEntityId ?? null,
    })),
    criteria: row.criteria ?? [],
  };
}

/** `GET /bank-reconciliation/sessions` — `bank_reconciliation.view` */
export async function fetchReconciliationSessions(
  query: ListSessionsQuery = {},
): Promise<PublicBankReconciliationSession[]> {
  const res = await apiGet<PublicBankReconciliationSession[]>(
    '/bank-reconciliation/sessions',
    { bankAccountId: query.bankAccountId },
  );
  return (res.data ?? []).map(normaliseSession);
}

/** `POST /bank-reconciliation/sessions` — `bank_reconciliation.manage` */
export async function createReconciliationSession(
  input: CreateReconciliationSessionInput,
): Promise<PublicBankReconciliationSession> {
  const res = await apiPost<PublicBankReconciliationSession>(
    '/bank-reconciliation/sessions',
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Create reconciliation session failed');
  }
  return normaliseSession(res.data);
}

/** `GET /bank-reconciliation/sessions/:sessionId` — `bank_reconciliation.view` */
export async function fetchReconciliationSession(
  sessionId: string,
): Promise<PublicBankReconciliationSession> {
  const res = await apiGet<PublicBankReconciliationSession>(
    `/bank-reconciliation/sessions/${sessionId}`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reconciliation session unavailable');
  }
  return normaliseSession(res.data);
}

/**
 * `POST /bank-reconciliation/sessions/:sessionId/import`
 * — `bank_reconciliation.import` (multipart).
 */
export async function importBankStatement(
  sessionId: string,
  input: ImportStatementInput,
): Promise<ImportStatementResult> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('columnMapping', JSON.stringify(input.columnMapping));
  if (input.replaceExisting) {
    form.append('replaceExisting', 'true');
  }
  const { data } = await apiClient.post<ApiResponse<ImportStatementResult>>(
    `/bank-reconciliation/sessions/${sessionId}/import`,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  if (!data.data) {
    throw new Error(data.message || 'Statement import failed');
  }
  return data.data;
}

/** `PATCH /bank-reconciliation/sessions/:sessionId/column-mapping` */
export async function updateColumnMapping(
  sessionId: string,
  columnMapping: StatementColumnMapping,
): Promise<PublicBankReconciliationSession> {
  const res = await apiPatch<PublicBankReconciliationSession>(
    `/bank-reconciliation/sessions/${sessionId}/column-mapping`,
    { columnMapping },
  );
  if (!res.data) {
    throw new Error(res.message || 'Column mapping update failed');
  }
  return normaliseSession(res.data);
}

/** `GET /bank-reconciliation/sessions/:sessionId/lines` */
export async function fetchStatementLines(
  sessionId: string,
  status?: BankStatementLineStatus,
): Promise<PublicBankStatementLine[]> {
  const res = await apiGet<PublicBankStatementLine[]>(
    `/bank-reconciliation/sessions/${sessionId}/lines`,
    { status },
  );
  return (res.data ?? []).map(normaliseLine);
}

/** `GET /bank-reconciliation/sessions/:sessionId/unmatched` */
export async function fetchUnmatched(
  sessionId: string,
): Promise<UnmatchedPayload> {
  const res = await apiGet<UnmatchedPayload>(
    `/bank-reconciliation/sessions/${sessionId}/unmatched`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Unmatched transactions unavailable');
  }
  return {
    statementLines: (res.data.statementLines ?? []).map(normaliseLine),
    bookLines: (res.data.bookLines ?? []).map(normaliseBook),
    statementUnmatchedCount: res.data.statementUnmatchedCount ?? 0,
    bookUnmatchedCount: res.data.bookUnmatchedCount ?? 0,
  };
}

/** `POST /bank-reconciliation/sessions/:sessionId/auto-match` */
export async function autoMatchSession(
  sessionId: string,
  input: AutoMatchInput = {},
): Promise<AutoMatchResult> {
  const res = await apiPost<AutoMatchResult>(
    `/bank-reconciliation/sessions/${sessionId}/auto-match`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Auto-match failed');
  }
  return res.data;
}

/** `POST /bank-reconciliation/sessions/:sessionId/match` */
export async function manualMatchSession(
  sessionId: string,
  input: ManualMatchInput,
): Promise<PublicBankReconciliationMatch> {
  const res = await apiPost<PublicBankReconciliationMatch>(
    `/bank-reconciliation/sessions/${sessionId}/match`,
    input,
  );
  if (!res.data) {
    throw new Error(res.message || 'Manual match failed');
  }
  return normaliseMatch(res.data);
}

/** `POST /bank-reconciliation/sessions/:sessionId/matches/:matchId/unmatch` */
export async function unmatchSessionMatch(
  sessionId: string,
  matchId: string,
): Promise<PublicBankReconciliationMatch> {
  const res = await apiPost<PublicBankReconciliationMatch>(
    `/bank-reconciliation/sessions/${sessionId}/matches/${matchId}/unmatch`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Unmatch failed');
  }
  return normaliseMatch(res.data);
}

/** `GET /bank-reconciliation/sessions/:sessionId/matches` */
export async function fetchMatches(
  sessionId: string,
): Promise<PublicBankReconciliationMatch[]> {
  const res = await apiGet<PublicBankReconciliationMatch[]>(
    `/bank-reconciliation/sessions/${sessionId}/matches`,
  );
  return (res.data ?? []).map(normaliseMatch);
}

/** `GET /bank-reconciliation/sessions/:sessionId/statement` */
export async function fetchReconciliationStatement(
  sessionId: string,
): Promise<ReconciliationStatement> {
  const res = await apiGet<ReconciliationStatement>(
    `/bank-reconciliation/sessions/${sessionId}/statement`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Reconciliation statement unavailable');
  }
  return {
    ...res.data,
    session: normaliseSession(res.data.session),
    unmatchedStatementLines: (res.data.unmatchedStatementLines ?? []).map(
      normaliseLine,
    ),
    unmatchedBookLines: (res.data.unmatchedBookLines ?? []).map(normaliseBook),
    matches: (res.data.matches ?? []).map(normaliseMatch),
    drillDown: res.data.drillDown ?? [],
  };
}

/** `POST /bank-reconciliation/sessions/:sessionId/complete` — manage/finalise */
export async function completeReconciliationSession(
  sessionId: string,
): Promise<PublicBankReconciliationSession> {
  const res = await apiPost<PublicBankReconciliationSession>(
    `/bank-reconciliation/sessions/${sessionId}/complete`,
  );
  if (!res.data) {
    throw new Error(res.message || 'Complete session failed');
  }
  return normaliseSession(res.data);
}

/** `POST /bank-reconciliation/sessions/:sessionId/adjustments` — post */
export async function postReconciliationAdjustment(
  sessionId: string,
  input: PostAdjustmentInput,
): Promise<{
  journalId: string;
  journalNumber: string;
  adjustmentType: string;
  amount: number;
  autoMatched: boolean;
}> {
  const res = await apiPost<{
    journalId: string;
    journalNumber: string;
    adjustmentType: string;
    amount: number;
    autoMatched: boolean;
  }>(`/bank-reconciliation/sessions/${sessionId}/adjustments`, input);
  if (!res.data) {
    throw new Error(res.message || 'Post adjustment failed');
  }
  return res.data;
}
