import { describe, expect, it } from 'vitest';
import {
  isExpenseEditable,
  isExpensePosted,
  siteExpenseCreateSchema,
  validateExpenseListFilters,
} from './validation';
import {
  SiteExpensePaymentMode,
  SiteExpenseVoucherStatus,
} from './types';

describe('expense list filter validation', () => {
  it('accepts status + date range', () => {
    expect(
      validateExpenseListFilters({
        projectId: '507f1f77bcf86cd799439011',
        status: SiteExpenseVoucherStatus.Submitted,
        dateFrom: '2026-07-01',
        dateTo: '2026-07-20',
      }).ok,
    ).toBe(true);
  });

  it('rejects inverted date range', () => {
    const res = validateExpenseListFilters({
      dateFrom: '2026-07-20',
      dateTo: '2026-07-01',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.message).toMatch(/on or after/i);
    }
  });
});

describe('site expense create schema', () => {
  it('accepts a valid create payload', () => {
    const parsed = siteExpenseCreateSchema.safeParse({
      expenseDate: '2026-07-21',
      pettyCashAccountId: '507f1f77bcf86cd799439011',
      expenseCategoryId: '507f1f77bcf86cd799439012',
      amount: 1500,
      paidTo: 'Ravi Kumar',
      purpose: 'Site labour',
      paymentMode: SiteExpensePaymentMode.Cash,
      billNumber: '',
      mobileNumber: '',
      submitImmediately: true,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects missing paid to', () => {
    const parsed = siteExpenseCreateSchema.safeParse({
      expenseDate: '2026-07-21',
      pettyCashAccountId: '507f1f77bcf86cd799439011',
      expenseCategoryId: '507f1f77bcf86cd799439012',
      amount: 1500,
      paidTo: '',
      purpose: 'Site labour',
      paymentMode: SiteExpensePaymentMode.Upi,
      submitImmediately: false,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('posted immutability helpers', () => {
  it('marks posted as not editable', () => {
    expect(isExpensePosted({ status: SiteExpenseVoucherStatus.Posted })).toBe(
      true,
    );
    expect(isExpenseEditable({ status: SiteExpenseVoucherStatus.Posted })).toBe(
      false,
    );
    expect(isExpenseEditable({ status: SiteExpenseVoucherStatus.Draft })).toBe(
      true,
    );
    expect(
      isExpenseEditable({ status: SiteExpenseVoucherStatus.Returned }),
    ).toBe(true);
    expect(
      isExpenseEditable({ status: SiteExpenseVoucherStatus.Submitted }),
    ).toBe(false);
  });
});
