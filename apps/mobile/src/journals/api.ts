import { apiGet, apiPost } from '@/api/client';
import type {
  CreateJournalInput,
  ListJournalsQuery,
  PaginatedJournals,
  PublicJournalEntry,
  ReverseJournalInput,
  ReverseJournalResult,
} from './types';

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseJournal(row: PublicJournalEntry): PublicJournalEntry {
  return {
    ...row,
    journalDate: toIso(row.journalDate) ?? row.journalDate,
    postedAt: toIso(row.postedAt),
    lines: row.lines ?? [],
  };
}

function readMeta(
  meta: Record<string, unknown> | undefined,
  page: number,
  limit: number,
): PaginatedJournals['meta'] {
  if (!meta) return null;
  return {
    page: Number(meta.page ?? page),
    limit: Number(meta.limit ?? limit),
    total: Number(meta.total ?? 0),
    totalPages: Number(meta.totalPages ?? 0),
    hasNextPage: Boolean(meta.hasNextPage),
    hasPrevPage: Boolean(meta.hasPrevPage),
  };
}

/** `GET /journals` — `journal.view` */
export async function fetchJournals(
  query: ListJournalsQuery = {},
): Promise<PaginatedJournals> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const res = await apiGet<PublicJournalEntry[]>('/journals', {
    page,
    limit,
    status: query.status,
    projectId: query.projectId,
    financialYearId: query.financialYearId,
    from: query.from,
    to: query.to,
    sourceModule: query.sourceModule,
  });
  return {
    items: (res.data ?? []).map(normaliseJournal),
    meta: readMeta(res.meta as Record<string, unknown> | undefined, page, limit),
  };
}

/** `GET /journals/:id` — `journal.view` */
export async function fetchJournal(id: string): Promise<PublicJournalEntry> {
  const res = await apiGet<PublicJournalEntry>(`/journals/${id}`);
  if (!res.data) throw new Error(res.message || 'Journal unavailable');
  return normaliseJournal(res.data);
}

/** `POST /journals` — `journal.create` */
export async function createJournal(
  input: CreateJournalInput,
): Promise<PublicJournalEntry> {
  const res = await apiPost<PublicJournalEntry>('/journals', input);
  if (!res.data) throw new Error(res.message || 'Create journal failed');
  return normaliseJournal(res.data);
}

/** `POST /journals/:id/submit` — `journal.create` */
export async function submitJournal(id: string): Promise<PublicJournalEntry> {
  const res = await apiPost<PublicJournalEntry>(`/journals/${id}/submit`);
  if (!res.data) throw new Error(res.message || 'Submit journal failed');
  return normaliseJournal(res.data);
}

/** `POST /journals/:id/post` — `journal.post` */
export async function postJournal(id: string): Promise<PublicJournalEntry> {
  const res = await apiPost<PublicJournalEntry>(`/journals/${id}/post`);
  if (!res.data) throw new Error(res.message || 'Post journal failed');
  return normaliseJournal(res.data);
}

/** `POST /journals/:id/reverse` — `journal.reverse` */
export async function reverseJournal(
  id: string,
  input: ReverseJournalInput = {},
): Promise<ReverseJournalResult> {
  const res = await apiPost<ReverseJournalResult>(
    `/journals/${id}/reverse`,
    input,
  );
  if (!res.data?.original || !res.data?.reversal) {
    throw new Error(res.message || 'Reverse journal failed');
  }
  return {
    original: normaliseJournal(res.data.original),
    reversal: normaliseJournal(res.data.reversal),
  };
}
