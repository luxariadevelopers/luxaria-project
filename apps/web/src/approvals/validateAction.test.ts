import { describe, expect, it } from 'vitest';
import { validateApprovalAction } from './validateAction';

describe('validateApprovalAction', () => {
  it('requires comment for reject and return', () => {
    expect(
      validateApprovalAction({ kind: 'reject', comment: '  ' }).fieldErrors
        .comment,
    ).toMatch(/required/);
    expect(
      validateApprovalAction({ kind: 'return', comment: '' }).fieldErrors
        .comment,
    ).toMatch(/required/);
  });

  it('allows approve and cancel without comment', () => {
    expect(
      validateApprovalAction({ kind: 'approve', comment: '' }).fieldErrors,
    ).toEqual({});
    expect(
      validateApprovalAction({ kind: 'cancel', comment: '  ' }).comment,
    ).toBeNull();
  });

  it('trims and returns comment when present', () => {
    const result = validateApprovalAction({
      kind: 'reject',
      comment: '  fix amount  ',
    });
    expect(result.comment).toBe('fix amount');
    expect(result.fieldErrors).toEqual({});
  });
});
