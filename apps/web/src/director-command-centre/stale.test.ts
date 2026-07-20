import { describe, expect, it } from 'vitest';
import {
  formatAsOfLabel,
  isAsOfDateStale,
  isLabourAsOfMismatched,
} from './stale';

describe('isAsOfDateStale', () => {
  const now = new Date('2026-07-20T12:00:00.000Z');

  it('marks earlier UTC days as stale', () => {
    expect(isAsOfDateStale('2026-07-19T00:00:00.000Z', now)).toBe(true);
    expect(isAsOfDateStale('2026-07-20T08:00:00.000Z', now)).toBe(false);
  });

  it('treats missing as not stale', () => {
    expect(isAsOfDateStale(null, now)).toBe(false);
    expect(isAsOfDateStale(undefined, now)).toBe(false);
  });
});

describe('isLabourAsOfMismatched', () => {
  it('detects day mismatch', () => {
    expect(
      isLabourAsOfMismatched(
        '2026-07-18T00:00:00.000Z',
        '2026-07-20T00:00:00.000Z',
      ),
    ).toBe(true);
    expect(
      isLabourAsOfMismatched(
        '2026-07-20T10:00:00.000Z',
        '2026-07-20T00:00:00.000Z',
      ),
    ).toBe(false);
  });
});

describe('formatAsOfLabel', () => {
  it('returns YYYY-MM-DD', () => {
    expect(formatAsOfLabel('2026-07-20T15:30:00.000Z')).toBe('2026-07-20');
  });
});
