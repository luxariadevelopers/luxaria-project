import { describe, expect, it } from 'vitest';
import {
  bankAccountCreateSchema,
  defaultBankAccountFilters,
  validateBankAccountFilters,
} from './validation';

describe('bankAccountCreateSchema', () => {
  const base = {
    bankName: 'HDFC Bank',
    branch: 'T Nagar',
    accountHolderName: 'Luxaria Developers Pvt. Ltd.',
    accountNumber: '123456789012',
    ifsc: 'HDFC0001234',
    accountType: 'current' as const,
    projectId: '',
    ledgerAccountId: '507f1f77bcf86cd799439011',
    openingBalance: 0,
    isDefault: false,
  };

  it('accepts valid IFSC and account number', () => {
    const parsed = bankAccountCreateSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid IFSC', () => {
    const parsed = bankAccountCreateSchema.safeParse({
      ...base,
      ifsc: 'BAD',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects short account numbers', () => {
    const parsed = bankAccountCreateSchema.safeParse({
      ...base,
      accountNumber: '12345',
    });
    expect(parsed.success).toBe(false);
  });

  it('normalises IFSC to uppercase', () => {
    const parsed = bankAccountCreateSchema.safeParse({
      ...base,
      ifsc: 'hdfc0001234',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ifsc).toBe('HDFC0001234');
    }
  });
});

describe('validateBankAccountFilters', () => {
  it('maps companyOnly and clamps pagination', () => {
    const result = validateBankAccountFilters({
      filters: {
        ...defaultBankAccountFilters(),
        companyOnly: true,
        status: 'active',
        search: 'HDFC',
      },
      page: 0,
      limit: 500,
    });
    expect(result.ready).toBe(true);
    expect(result.api.companyOnly).toBe(true);
    expect(result.api.projectId).toBeUndefined();
    expect(result.api.status).toBe('active');
    expect(result.api.search).toBe('HDFC');
    expect(result.api.page).toBe(1);
    expect(result.api.limit).toBe(100);
  });

  it('rejects invented status values', () => {
    const result = validateBankAccountFilters({
      filters: {
        ...defaultBankAccountFilters(),
        status: 'pending',
      },
      page: 1,
      limit: 20,
    });
    expect(result.ready).toBe(false);
    expect(result.fieldErrors.status).toBeTruthy();
  });
});
