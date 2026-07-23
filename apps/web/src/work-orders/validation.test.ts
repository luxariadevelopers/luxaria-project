import { describe, expect, it } from 'vitest';
import { BoqUnit } from '@/boq/types';
import {
  amendWorkOrderSchema,
  formValuesToCreateInput,
  workOrderFormSchema,
} from './validation';

describe('workOrderFormSchema', () => {
  it('requires contractor, dates, and at least one BOQ line', () => {
    const parsed = workOrderFormSchema.safeParse({
      contractorId: '',
      projectId: '507f1f77bcf86cd799439012',
      boqScopeLines: [],
      startDate: '2026-12-31',
      endDate: '2026-01-01',
      materialResponsibility: 'company',
      labourResponsibility: 'contractor',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a valid create payload', () => {
    const parsed = workOrderFormSchema.safeParse({
      contractorId: '507f1f77bcf86cd799439011',
      projectId: '507f1f77bcf86cd799439012',
      boqScopeLines: [
        {
          description: 'RCC columns',
          unit: BoqUnit.CubicMetre,
          quantity: 10,
          rate: 450,
        },
      ],
      locations: 'Block A',
      startDate: '2026-08-01',
      endDate: '2027-01-31',
      materialResponsibility: 'company',
      labourResponsibility: 'contractor',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const input = formValuesToCreateInput(parsed.data);
      expect(input.locations).toEqual(['Block A']);
      expect(input.boqScopeLines).toHaveLength(1);
    }
  });
});

describe('amendWorkOrderSchema', () => {
  it('requires revised value for revised_value type', () => {
    const parsed = amendWorkOrderSchema.safeParse({
      type: 'revised_value',
      reason: 'Price revision',
      revisedValue: null,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts time_extension with dates', () => {
    const parsed = amendWorkOrderSchema.safeParse({
      type: 'time_extension',
      reason: 'Monsoon delay',
      startDate: '2026-08-01',
      endDate: '2027-03-31',
    });
    expect(parsed.success).toBe(true);
  });
});
