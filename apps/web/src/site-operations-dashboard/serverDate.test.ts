import { describe, expect, it } from 'vitest';
import { isSameUtcDay, toUtcDateKey, utcTodayIsoDate } from './serverDate';

describe('serverDate UTC helpers', () => {
  it('formats UTC today as YYYY-MM-DD', () => {
    expect(utcTodayIsoDate(new Date('2026-07-20T18:30:00.000Z'))).toBe(
      '2026-07-20',
    );
  });

  it('normalizes ISO timestamps to UTC date keys', () => {
    expect(toUtcDateKey('2026-07-20T00:00:00.000Z')).toBe('2026-07-20');
    expect(toUtcDateKey('2026-07-20')).toBe('2026-07-20');
  });

  it('compares GRN receivedDate to as-of UTC day', () => {
    expect(isSameUtcDay('2026-07-20T12:00:00.000Z', '2026-07-20')).toBe(true);
    expect(isSameUtcDay('2026-07-19T23:00:00.000Z', '2026-07-20')).toBe(false);
  });
});
