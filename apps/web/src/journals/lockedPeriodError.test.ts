import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  isLockedPeriodError,
  lockedPeriodUserMessage,
} from './lockedPeriodError';

function forbidden(message: string) {
  return new AxiosError(message, 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 403,
    statusText: 'Forbidden',
    headers: {},
    config: {} as never,
    data: { message, errorCode: 'FORBIDDEN' },
  });
}

describe('locked period errors', () => {
  it('detects Nest locked FY ForbiddenException messages', () => {
    const err = forbidden(
      'Financial year is locked; accounting postings are rejected',
    );
    expect(isLockedPeriodError(err)).toBe(true);
    expect(lockedPeriodUserMessage(err)).toMatch(/locked/i);
  });

  it('detects closed FY and blocked accounting period', () => {
    expect(
      isLockedPeriodError(
        forbidden(
          'Financial year is closed; accounting postings are rejected',
        ),
      ),
    ).toBe(true);
    expect(
      isLockedPeriodError(
        forbidden(
          'Accounting period 3 is closed; accounting postings are rejected',
        ),
      ),
    ).toBe(true);
  });

  it('ignores unrelated 403s', () => {
    const err = forbidden('Missing journal.post permission');
    expect(isLockedPeriodError(err)).toBe(false);
  });
});
