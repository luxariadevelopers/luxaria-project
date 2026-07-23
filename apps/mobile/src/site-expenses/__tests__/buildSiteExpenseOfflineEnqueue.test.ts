import { buildSiteExpenseOfflineEnqueue } from '../buildSiteExpenseOfflineEnqueue';
import { SiteExpensePaymentMode } from '../types';

describe('buildSiteExpenseOfflineEnqueue', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    pettyCashAccountId: '507f1f77bcf86cd799439012',
    expenseDate: '2026-07-20',
    expenseCategoryId: '507f1f77bcf86cd799439013',
    amount: 1500,
    paidTo: 'Ravi Kumar',
    purpose: 'Scaffolding labour',
    paymentMode: SiteExpensePaymentMode.Cash,
  };

  const signature = {
    uri: 'file:///cache/sig.jpg',
    name: 'sig.jpg',
    mimeType: 'image/jpeg',
    size: 1200,
  };

  it('builds create+submit enqueue without media when signature not required', () => {
    const enqueue = buildSiteExpenseOfflineEnqueue(base);
    expect(enqueue.type).toBe('site_expense.create');
    expect(enqueue.endpoint).toBe('/site-expense-vouchers');
    expect(enqueue.payload.submitAfterCreate).toBe(true);
    expect(enqueue.payload.amount).toBe(1500);
    expect(enqueue.media).toBeUndefined();
  });

  it('includes signature media when provided', () => {
    const enqueue = buildSiteExpenseOfflineEnqueue({
      ...base,
      requiresSignature: true,
      signature,
    });
    expect(enqueue.media).toHaveLength(1);
    expect(enqueue.media?.[0]?.fieldKey).toBe('signature');
    expect(enqueue.media?.[0]?.localPath).toBe(signature.uri);
  });

  it('rejects when signature required but missing', () => {
    expect(() =>
      buildSiteExpenseOfflineEnqueue({
        ...base,
        requiresSignature: true,
      }),
    ).toThrow(/signature/i);
  });

  it('rejects invalid amount', () => {
    expect(() =>
      buildSiteExpenseOfflineEnqueue({ ...base, amount: 0 }),
    ).toThrow(/amount/i);
  });
});
