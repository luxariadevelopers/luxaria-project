import { describe, expect, it } from 'vitest';
import {
  financialYearFormSchema,
  isCalendarDate,
  toCreateFinancialYearInput,
  transactionDateSchema,
  unlockRejectionSchema,
  unlockRequestSchema,
} from './validation';

describe('financial year validation', () => {
  it('accepts real calendar dates and rejects impossible dates', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
  });

  it('requires a non-empty name and an ordered date range', () => {
    const result = financialYearFormSchema.safeParse({
      name: ' ',
      startDate: '2027-04-01',
      endDate: '2027-03-31',
      setAsCurrent: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name?.[0]).toMatch(
        /name is required/i,
      );
      expect(result.error.flatten().fieldErrors.endDate?.[0]).toMatch(
        /on or after/i,
      );
    }
  });

  it('builds the server create DTO with authenticated company id', () => {
    const parsed = financialYearFormSchema.parse({
      name: ' FY 2026-27 ',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      setAsCurrent: true,
    });

    expect(
      toCreateFinancialYearInput(
        parsed,
        '507f1f77bcf86cd799439011',
      ),
    ).toEqual({
      name: 'FY 2026-27',
      startDate: '2026-04-01',
      endDate: '2027-03-31',
      companyId: '507f1f77bcf86cd799439011',
      setAsCurrent: true,
    });
  });

  it('mirrors unlock and transaction DTO minimum validation', () => {
    expect(unlockRequestSchema.safeParse({ reason: 'short' }).success).toBe(
      false,
    );
    expect(
      unlockRequestSchema.safeParse({
        reason: 'Correct journal posting',
      }).success,
    ).toBe(true);
    expect(
      unlockRejectionSchema.safeParse({ rejectionReason: 'no' }).success,
    ).toBe(false);
    expect(
      transactionDateSchema.safeParse({
        transactionDate: 'not-a-date',
        forPosting: true,
      }).success,
    ).toBe(false);
  });
});
