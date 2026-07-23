import { describe, expect, it } from 'vitest';
import {
  formValuesToCreateInput,
  recoveryFormSchema,
} from './validation';

describe('recoveryFormSchema', () => {
  it('requires contractor and project', () => {
    const parsed = recoveryFormSchema.safeParse({
      projectId: '',
      contractorId: '',
      type: 'manual',
      amount: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a valid create payload', () => {
    const parsed = recoveryFormSchema.safeParse({
      projectId: '507f1f77bcf86cd799439012',
      contractorId: '507f1f77bcf86cd799439011',
      type: 'material',
      amount: 2500,
      description: 'Excess issue recovery',
      workOrderId: '',
      billId: '',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const input = formValuesToCreateInput(parsed.data);
      expect(input.workOrderId).toBeNull();
      expect(input.type).toBe('material');
      expect(input.amount).toBe(2500);
    }
  });
});
