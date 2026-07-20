import { describe, expect, it } from 'vitest';
import { BoqUnit } from '@/boq/types';
import { ContractorAgreementBillingCycle } from './types';
import { agreementFormSchema } from './validation';

describe('agreementFormSchema', () => {
  it('requires at least one BOQ line and valid dates', () => {
    const parsed = agreementFormSchema.safeParse({
      contractorId: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439012',
      workScope: 'Civil works',
      boqItems: [],
      manpowerCommitment: 10,
      startDate: '2026-12-31',
      endDate: '2026-01-01',
      billingCycle: ContractorAgreementBillingCycle.Monthly,
      retentionPercentage: 5,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid commercial payload', () => {
    const parsed = agreementFormSchema.safeParse({
      contractorId: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439012',
      workScope: 'Block A finishing',
      boqItems: [
        {
          description: 'RCC columns',
          unit: BoqUnit.CubicMetre,
          agreedQuantity: 100,
          agreedRate: 450,
        },
      ],
      manpowerCommitment: 25,
      skillMix: [{ skill: 'mason', headcount: 12 }],
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      billingCycle: ContractorAgreementBillingCycle.Monthly,
      retentionPercentage: 5,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects retention outside 0–100', () => {
    const parsed = agreementFormSchema.safeParse({
      contractorId: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439012',
      workScope: 'Works',
      boqItems: [
        {
          description: 'Line',
          unit: BoqUnit.Number,
          agreedQuantity: 1,
          agreedRate: 100,
        },
      ],
      manpowerCommitment: 1,
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      billingCycle: ContractorAgreementBillingCycle.Monthly,
      retentionPercentage: 150,
    });
    expect(parsed.success).toBe(false);
  });
});
