import { describe, expect, it } from 'vitest';
import {
  publishInvestorReportSchema,
  recordInvestorProfitSchema,
  updateDistributedProfitSchema,
} from './validation';

const PARTICIPANT_ID = '507f1f77bcf86cd799439011';
const ALLOCATION_ID = '507f1f77bcf86cd799439012';

describe('investor portal manage validation', () => {
  it('requires report title', () => {
    const result = publishInvestorReportSchema.safeParse({
      title: '',
      reportType: 'progress',
      summary: '',
      documentPath: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects distributed above allocated on record form', () => {
    const result = recordInvestorProfitSchema.safeParse({
      participantId: PARTICIPANT_ID,
      periodLabel: '',
      allocatedAmount: 100,
      distributedAmount: 150,
      notes: '',
      approvedAt: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid profit allocation', () => {
    const result = recordInvestorProfitSchema.safeParse({
      participantId: PARTICIPANT_ID,
      periodLabel: 'FY25',
      allocatedAmount: 100,
      distributedAmount: 25,
      notes: '',
      approvedAt: '',
    });
    expect(result.success).toBe(true);
  });

  it('validates distributed against known allocated reference', () => {
    const bad = updateDistributedProfitSchema.safeParse({
      allocationId: ALLOCATION_ID,
      allocatedAmount: 100,
      distributedAmount: 200,
    });
    expect(bad.success).toBe(false);

    const ok = updateDistributedProfitSchema.safeParse({
      allocationId: ALLOCATION_ID,
      allocatedAmount: 100,
      distributedAmount: 50,
    });
    expect(ok.success).toBe(true);
  });
});
