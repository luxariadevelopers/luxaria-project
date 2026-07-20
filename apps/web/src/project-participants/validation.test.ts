import { describe, expect, it } from 'vitest';
import { InstrumentType, ParticipantType } from './types';
import { participantCreateSchema } from './validation';

describe('participantCreateSchema', () => {
  const base = {
    participantType: ParticipantType.Director,
    participantId: '507f1f77bcf86cd799439011',
    commitmentAmount: 1_000_000,
    expectedContributionDate: '',
    actualContributionAmount: 0,
    approvedProfitSharePercentage: 25,
    lossSharePercentage: 25,
    interestRate: null as number | null,
    instrumentType: InstrumentType.ProjectInvestment,
    effectiveFrom: '',
    notes: '',
  };

  it('accepts a valid non-loan create payload', () => {
    const parsed = participantCreateSchema.parse(base);
    expect(parsed.participantId).toBe(base.participantId);
    expect(parsed.approvedProfitSharePercentage).toBe(25);
  });

  it('requires interestRate for loan instruments', () => {
    const result = participantCreateSchema.safeParse({
      ...base,
      instrumentType: InstrumentType.DirectorLoan,
      interestRate: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid participant ids', () => {
    const result = participantCreateSchema.safeParse({
      ...base,
      participantId: 'not-an-id',
    });
    expect(result.success).toBe(false);
  });
});
