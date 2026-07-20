import { describe, expect, it } from 'vitest';
import {
  defaultJournalFilters,
  validateJournalFilters,
} from './validateFilters';

describe('validateJournalFilters', () => {
  it('maps pagination and supported filters to Nest query', () => {
    const result = validateJournalFilters({
      filters: {
        ...defaultJournalFilters(),
        status: 'posted',
        projectId: '507f1f77bcf86cd799439011',
        financialYearId: '507f1f77bcf86cd799439012',
        sourceModule: 'Vendor_Invoice',
        from: '2026-04-01',
        to: '2026-07-20',
      },
      page: 2,
      limit: 50,
    });

    expect(result.ready).toBe(true);
    expect(result.fieldErrors).toEqual({});
    expect(result.api).toEqual({
      page: 2,
      limit: 50,
      status: 'posted',
      projectId: '507f1f77bcf86cd799439011',
      financialYearId: '507f1f77bcf86cd799439012',
      sourceModule: 'vendor_invoice',
      from: '2026-04-01',
      to: '2026-07-20',
    });
  });

  it('clamps page and limit', () => {
    const result = validateJournalFilters({
      filters: defaultJournalFilters(),
      page: 0,
      limit: 500,
    });
    expect(result.api.page).toBe(1);
    expect(result.api.limit).toBe(100);
  });

  it('rejects invalid date range (to before from)', () => {
    const result = validateJournalFilters({
      filters: {
        ...defaultJournalFilters(),
        from: '2026-07-20',
        to: '2026-07-01',
      },
      page: 1,
      limit: 20,
    });
    expect(result.ready).toBe(false);
    expect(result.fieldErrors.to).toMatch(/on or after/i);
    expect(result.api.from).toBe('2026-07-20');
    expect(result.api.to).toBe('2026-07-01');
  });

  it('rejects malformed dates and ObjectIds', () => {
    const result = validateJournalFilters({
      filters: {
        ...defaultJournalFilters(),
        from: '20-07-2026',
        projectId: 'not-an-id',
        financialYearId: 'also-bad',
        status: 'bogus',
      },
      page: 1,
      limit: 20,
    });
    expect(result.ready).toBe(false);
    expect(result.fieldErrors.from).toBeTruthy();
    expect(result.fieldErrors.projectId).toBeTruthy();
    expect(result.fieldErrors.financialYearId).toBeTruthy();
    expect(result.fieldErrors.status).toBeTruthy();
    expect(result.api.projectId).toBeUndefined();
    expect(result.api.status).toBeUndefined();
  });

  it('allows empty filters (all journals)', () => {
    const result = validateJournalFilters({
      filters: defaultJournalFilters(),
      page: 1,
      limit: 20,
    });
    expect(result.ready).toBe(true);
    expect(result.api).toEqual({ page: 1, limit: 20 });
  });
});
