import { describe, expect, it } from 'vitest';
import type { ExpenseCapabilities } from './roleAccess';
import { SiteExpenseVoucherStatus } from './types';
import {
  isExpenseEvidenceReadOnly,
  isExpensePosted,
  resolveExpenseDetailActions,
} from './workflowActions';

const fullCaps: ExpenseCapabilities = {
  canView: true,
  canCreate: true,
  canApprove: true,
  canPost: true,
  canVerify: true,
  canCancel: true,
};

const viewOnly: ExpenseCapabilities = {
  canView: true,
  canCreate: false,
  canApprove: false,
  canPost: false,
  canVerify: false,
  canCancel: false,
};

describe('resolveExpenseDetailActions — status gates', () => {
  it('allows verify/reject/return on submitted when canApprove', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Submitted },
        fullCaps,
      ),
    ).toEqual(
      expect.arrayContaining(['verify', 'reject', 'return', 'cancel']),
    );
  });

  it('allows approve/reject/return on verified', () => {
    const actions = resolveExpenseDetailActions(
      { status: SiteExpenseVoucherStatus.Verified },
      fullCaps,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['approve', 'reject', 'return']),
    );
    expect(actions).not.toContain('verify');
    expect(actions).not.toContain('post');
  });

  it('allows post only when approved', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Approved },
        fullCaps,
      ),
    ).toContain('post');
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Verified },
        fullCaps,
      ),
    ).not.toContain('post');
  });

  it('offers no workflow actions on posted (immutable)', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Posted },
        fullCaps,
      ),
    ).toEqual([]);
  });

  it('denies verify/approve/post without permissions', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Submitted },
        viewOnly,
      ),
    ).toEqual([]);
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Approved },
        viewOnly,
      ),
    ).toEqual([]);
  });

  it('allows cancel with expense.create on draft/returned', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Draft },
        fullCaps,
      ),
    ).toEqual(['cancel']);
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Returned },
        { ...fullCaps, canCancel: false, canCreate: false },
      ),
    ).toEqual([]);
  });
});

describe('isExpensePosted / evidence read-only', () => {
  it('treats posted + journal as posted', () => {
    expect(
      isExpensePosted({
        status: SiteExpenseVoucherStatus.Posted,
        journalEntryId: 'j1',
        postedAt: '2026-07-20T00:00:00.000Z',
      }),
    ).toBe(true);
  });

  it('keeps evidence read-only outside draft/returned', () => {
    expect(isExpenseEvidenceReadOnly(SiteExpenseVoucherStatus.Submitted)).toBe(
      true,
    );
    expect(isExpenseEvidenceReadOnly(SiteExpenseVoucherStatus.Posted)).toBe(
      true,
    );
    expect(isExpenseEvidenceReadOnly(SiteExpenseVoucherStatus.Draft)).toBe(
      false,
    );
    expect(isExpenseEvidenceReadOnly(SiteExpenseVoucherStatus.Returned)).toBe(
      false,
    );
  });
});
