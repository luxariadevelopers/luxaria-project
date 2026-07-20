import { BadRequestException } from '@nestjs/common';
import { normalizeReportDate, reportDateKey } from './dpr.validation';

describe('dpr.validation', () => {
  it('normalizes report dates to UTC midnight', () => {
    const a = normalizeReportDate('2026-07-17');
    const b = normalizeReportDate('2026-07-17T18:30:00.000Z');
    expect(reportDateKey(a)).toBe('2026-07-17');
    expect(reportDateKey(b)).toBe('2026-07-17');
    expect(a.getTime()).toBe(b.getTime());
  });

  it('rejects invalid dates', () => {
    expect(() => normalizeReportDate('not-a-date')).toThrow(
      BadRequestException,
    );
  });
});
