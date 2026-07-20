import { describe, expect, it, vi } from 'vitest';
import {
  applyServerFieldErrors,
  isFormEditable,
  shapeCreatePayload,
  shapeUpdatePayload,
} from './formHelpers';

describe('formHelpers', () => {
  it('shapeCreatePayload omits empty values and trims strings', () => {
    expect(
      shapeCreatePayload({
        title: '  Hello  ',
        notes: '',
        amount: 10,
        skip: null,
        keepZero: 0,
        tags: [],
      }),
    ).toEqual({
      title: 'Hello',
      amount: 10,
      keepZero: 0,
    });
  });

  it('shapeUpdatePayload keeps only dirty fields', () => {
    expect(
      shapeUpdatePayload(
        { title: 'A', amount: 5, notes: 'n' },
        { title: true, amount: false },
      ),
    ).toEqual({ title: 'A' });
  });

  it('applyServerFieldErrors maps onto setError', () => {
    const setError = vi.fn();
    applyServerFieldErrors(setError, {
      email: 'email must be an email',
      amount: 'Amount must be ≥ 0',
    });
    expect(setError).toHaveBeenCalledWith('email', {
      type: 'server',
      message: 'email must be an email',
    });
    expect(setError).toHaveBeenCalledWith('amount', {
      type: 'server',
      message: 'Amount must be ≥ 0',
    });
  });

  it('isFormEditable requires permission and editable status', () => {
    expect(
      isFormEditable({ hasPermission: true, statusAllowsEdit: true }),
    ).toBe(true);
    expect(
      isFormEditable({ hasPermission: false, statusAllowsEdit: true }),
    ).toBe(false);
    expect(
      isFormEditable({ hasPermission: true, statusAllowsEdit: false }),
    ).toBe(false);
  });
});
