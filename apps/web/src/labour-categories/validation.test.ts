import { describe, expect, it } from 'vitest';
import {
  labourCategoryFormSchema,
  labourCategoryRateFormSchema,
} from './validation';
import { LabourSkillLevel } from './types';

describe('labour category validation', () => {
  it('rejects negative rates', () => {
    const result = labourCategoryFormSchema.safeParse({
      name: 'Mason',
      skillLevel: LabourSkillLevel.Skilled,
      defaultDailyRate: -1,
      overtimeRate: 100,
    });
    expect(result.success).toBe(false);
  });

  it('requires project and/or contractor for rate overrides', () => {
    const result = labourCategoryRateFormSchema.safeParse({
      projectId: '',
      contractorId: '',
      dailyRate: 1000,
      overtimeRate: 1500,
      effectiveDate: '2026-07-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid effective dates', () => {
    const result = labourCategoryRateFormSchema.safeParse({
      projectId: '507f1f77bcf86cd799439011',
      contractorId: '',
      dailyRate: 1000,
      overtimeRate: 1500,
      effectiveDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});
