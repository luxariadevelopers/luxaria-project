import { describe, expect, it } from 'vitest';
import { resolveExpenseCapabilities } from './roleAccess';

describe('resolveExpenseCapabilities', () => {
  it('maps Nest expense.* codes (no expense.verify / expense.reverse)', () => {
    const caps = resolveExpenseCapabilities((code) =>
      ['expense.view', 'expense.approve', 'expense.post'].includes(code),
    );
    expect(caps.canView).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canVerify).toBe(true);
    expect(caps.canPost).toBe(true);
    expect(caps.canCreate).toBe(false);
    expect(caps.canCancel).toBe(false);
  });

  it('folds verify into expense.approve', () => {
    const caps = resolveExpenseCapabilities(
      (code) => code === 'expense.approve',
    );
    expect(caps.canVerify).toBe(true);
    expect(caps.canApprove).toBe(true);
    expect(caps.canPost).toBe(false);
  });

  it('folds cancel into expense.create', () => {
    const caps = resolveExpenseCapabilities(
      (code) => code === 'expense.create',
    );
    expect(caps.canCancel).toBe(true);
    expect(caps.canCreate).toBe(true);
    expect(caps.canApprove).toBe(false);
  });
});
