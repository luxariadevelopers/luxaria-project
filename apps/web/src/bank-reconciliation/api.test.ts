import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autoMatchSession,
  fetchReconciliationSessions,
  fetchUnmatched,
  importBankStatement,
  manualMatchSession,
} from './api';

const apiGet = vi.fn();
const apiPost = vi.fn();
const apiPatch = vi.fn();
const apiClientPost = vi.fn();

vi.mock('@/api/client', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPatch: (...args: unknown[]) => apiPatch(...args),
  apiClient: {
    post: (...args: unknown[]) => apiClientPost(...args),
  },
}));

describe('bank reconciliation API client', () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    apiPatch.mockReset();
    apiClientPost.mockReset();
  });

  it('lists sessions with optional bankAccountId', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: [
        {
          id: 's1',
          sessionNumber: 'BR-1',
          bankAccountId: 'b1',
          ledgerAccountId: 'l1',
          statementFrom: '2026-07-01T00:00:00.000Z',
          statementTo: '2026-07-31T00:00:00.000Z',
          statementOpeningBalance: 0,
          statementClosingBalance: 100,
          columnMapping: null,
          sourceFileName: null,
          status: 'draft',
          notes: null,
          completedAt: null,
        },
      ],
    });

    const rows = await fetchReconciliationSessions({ bankAccountId: 'b1' });
    expect(apiGet).toHaveBeenCalledWith('/bank-reconciliation/sessions', {
      bankAccountId: 'b1',
    });
    expect(rows[0]?.sessionNumber).toBe('BR-1');
  });

  it('imports statement via multipart FormData', async () => {
    apiClientPost.mockResolvedValue({
      data: {
        success: true,
        message: 'imported',
        data: { sessionId: 's1', importedCount: 2, fileName: 'a.csv' },
      },
    });
    const file = new File(['Date,Amount\n2026-07-01,10'], 'a.csv', {
      type: 'text/csv',
    });
    const result = await importBankStatement('s1', {
      file,
      columnMapping: { date: 'Date', amount: 'Amount' },
      replaceExisting: true,
    });
    expect(apiClientPost).toHaveBeenCalled();
    const [, form] = apiClientPost.mock.calls[0] as [string, FormData];
    expect(form.get('replaceExisting')).toBe('true');
    expect(form.get('columnMapping')).toBe(
      JSON.stringify({ date: 'Date', amount: 'Amount' }),
    );
    expect(result.importedCount).toBe(2);
  });

  it('auto-matches with date tolerance body', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { sessionId: 's1', matchCount: 3 },
    });
    const result = await autoMatchSession('s1', { dateToleranceDays: 2 });
    expect(apiPost).toHaveBeenCalledWith(
      '/bank-reconciliation/sessions/s1/auto-match',
      { dateToleranceDays: 2 },
    );
    expect(result.matchCount).toBe(3);
  });

  it('manual match posts statement and book line refs', async () => {
    apiPost.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        id: 'm1',
        sessionId: 's1',
        statementLineIds: ['l1'],
        bookLines: [
          {
            journalId: 'j1',
            journalLineId: 'jl1',
            journalNumber: 'JV-1',
            journalDate: '2026-07-01T00:00:00.000Z',
            debit: 0,
            credit: 100,
            narration: 'x',
            lineDescription: null,
            sourceModule: null,
            sourceEntityId: null,
          },
        ],
        matchType: 'manual',
        criteria: ['composite'],
        status: 'active',
        matchedAt: '2026-07-02T00:00:00.000Z',
        undoneAt: null,
        notes: null,
      },
    });
    const match = await manualMatchSession('s1', {
      statementLineIds: ['l1'],
      bookLines: [{ journalId: 'j1', journalLineId: 'jl1' }],
    });
    expect(match.matchType).toBe('manual');
    expect(apiPost).toHaveBeenCalledWith(
      '/bank-reconciliation/sessions/s1/match',
      {
        statementLineIds: ['l1'],
        bookLines: [{ journalId: 'j1', journalLineId: 'jl1' }],
      },
    );
  });

  it('loads unmatched statement and book panels', async () => {
    apiGet.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        statementLines: [],
        bookLines: [],
        statementUnmatchedCount: 0,
        bookUnmatchedCount: 0,
      },
    });
    const payload = await fetchUnmatched('s1');
    expect(apiGet).toHaveBeenCalledWith(
      '/bank-reconciliation/sessions/s1/unmatched',
    );
    expect(payload.statementUnmatchedCount).toBe(0);
  });
});
