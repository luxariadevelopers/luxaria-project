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

  it('builds create+submit enqueue without media', () => {
    const enqueue = buildSiteExpenseOfflineEnqueue(base);
    expect(enqueue.type).toBe('site_expense.create');
    expect(enqueue.endpoint).toBe('/site-expense-vouchers');
    expect(enqueue.payload.submitAfterCreate).toBe(true);
    expect(enqueue.payload.amount).toBe(1500);
    expect(enqueue.media).toBeUndefined();
  });

  it('rejects invalid amount', () => {
    expect(() =>
      buildSiteExpenseOfflineEnqueue({ ...base, amount: 0 }),
    ).toThrow(/amount/i);
  });
});
