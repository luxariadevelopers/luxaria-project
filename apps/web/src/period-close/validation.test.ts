import { describe, expect, it } from 'vitest';
import {
  requestPeriodReopenSchema,
  rejectPeriodReopenSchema,
} from './validation';

describe('period-close validation', () => {
  it('requires reopen reason (Nest min 5)', () => {
    const short = requestPeriodReopenSchema.safeParse({ reason: 'fix' });
    expect(short.success).toBe(false);

    const ok = requestPeriodReopenSchema.safeParse({
      reason: 'Need late bank charge',
    });
    expect(ok.success).toBe(true);
  });

  it('requires rejection reason (Nest min 3)', () => {
    const short = rejectPeriodReopenSchema.safeParse({
      rejectionReason: 'no',
    });
    expect(short.success).toBe(false);

    const ok = rejectPeriodReopenSchema.safeParse({
      rejectionReason: 'Not justified',
    });
    expect(ok.success).toBe(true);
  });
});
