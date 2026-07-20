import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIST_PAGE_SIZE,
  MAX_LIST_PAGE_SIZE,
  buildListQueryParams,
  clampListLimit,
  clampListPage,
  sanitizeSortBy,
  sanitizeSortOrder,
} from './listQuery';

describe('listQuery helpers', () => {
  it('clamps page size to 1…100 with default 20', () => {
    expect(clampListLimit(undefined)).toBe(DEFAULT_LIST_PAGE_SIZE);
    expect(clampListLimit(0)).toBe(DEFAULT_LIST_PAGE_SIZE);
    expect(clampListLimit(-5)).toBe(DEFAULT_LIST_PAGE_SIZE);
    expect(clampListLimit(10)).toBe(10);
    expect(clampListLimit(100)).toBe(MAX_LIST_PAGE_SIZE);
    expect(clampListLimit(250)).toBe(MAX_LIST_PAGE_SIZE);
    expect(clampListLimit(20.9)).toBe(20);
  });

  it('clamps page to ≥ 1', () => {
    expect(clampListPage(0)).toBe(1);
    expect(clampListPage(-2)).toBe(1);
    expect(clampListPage(3)).toBe(3);
  });

  it('rejects unsupported sort keys', () => {
    const allowed = ['createdAt', 'projectName'] as const;
    expect(sanitizeSortBy('projectName', allowed)).toBe('projectName');
    expect(sanitizeSortBy('passwordHash', allowed)).toBe('createdAt');
    expect(sanitizeSortBy(undefined, allowed)).toBe('createdAt');
  });

  it('sanitizes sort order', () => {
    expect(sanitizeSortOrder('asc')).toBe('asc');
    expect(sanitizeSortOrder('desc')).toBe('desc');
    expect(sanitizeSortOrder('nope')).toBe('desc');
  });

  it('builds Nest-compatible list query params', () => {
    expect(
      buildListQueryParams({
        page: 2,
        limit: 50,
        sortBy: 'projectName',
        sortOrder: 'asc',
        search: ' luxaria ',
        filters: { status: 'active', empty: '' },
        allowedSortKeys: ['createdAt', 'projectName'],
      }),
    ).toEqual({
      page: 2,
      limit: 50,
      sortBy: 'projectName',
      sortOrder: 'asc',
      search: 'luxaria',
      status: 'active',
    });
  });
});
