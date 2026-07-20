import { describe, expect, it } from 'vitest';
import type { PettyCashRequestCapabilities } from './roleAccess';
import {
  isPettyCashRequestEditable,
  resolvePettyCashRequestActions,
  resolvePettyCashRequestRowActions,
} from './workflowActions';
import { PettyCashRequirementStatus } from './types';

const fullCaps: PettyCashRequestCapabilities = {
  canView: true,
  canRequest: true,
  canApprove: true,
  canFund: true,
  canViewCash: true,
};

describe('isPettyCashRequestEditable', () => {
  it('allows draft and returned only', () => {
    expect(isPettyCashRequestEditable(PettyCashRequirementStatus.Draft)).toBe(
      true,
    );
    expect(
      isPettyCashRequestEditable(PettyCashRequirementStatus.Returned),
    ).toBe(true);
    expect(
      isPettyCashRequestEditable(PettyCashRequirementStatus.Submitted),
    ).toBe(false);
  });
});

describe('resolvePettyCashRequestRowActions — approval states', () => {
  it('allows submit from draft and returned only', () => {
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Draft },
        fullCaps,
      ),
    ).toContain('submit');
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Returned },
        fullCaps,
      ),
    ).toContain('submit');
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Submitted },
        fullCaps,
      ),
    ).not.toContain('submit');
  });

  it('allows PM review from submitted / project_manager_review', () => {
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Submitted },
        fullCaps,
      ),
    ).toEqual(expect.arrayContaining(['pm_approve', 'reject', 'return']));
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.ProjectManagerReview },
        fullCaps,
      ),
    ).toContain('pm_approve');
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.FinanceReview },
        fullCaps,
      ),
    ).not.toContain('pm_approve');
  });

  it('allows finance approve only in finance_review', () => {
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.FinanceReview },
        fullCaps,
      ),
    ).toContain('finance_approve');
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Submitted },
        fullCaps,
      ),
    ).not.toContain('finance_approve');
  });

  it('allows fund only when approved', () => {
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Approved },
        fullCaps,
      ),
    ).toContain('fund');
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.FinanceReview },
        fullCaps,
      ),
    ).not.toContain('fund');
  });

  it('denies review/approve/fund without permissions', () => {
    const viewOnly: PettyCashRequestCapabilities = {
      canView: true,
      canRequest: false,
      canApprove: false,
      canFund: false,
      canViewCash: false,
    };
    expect(
      resolvePettyCashRequestRowActions(
        { status: PettyCashRequirementStatus.Submitted },
        viewOnly,
      ),
    ).toEqual([]);
  });
});

describe('resolvePettyCashRequestActions', () => {
  it('offers save/submit/cancel on draft when canRequest', () => {
    const actions = resolvePettyCashRequestActions(
      { status: PettyCashRequirementStatus.Draft },
      fullCaps,
    );
    expect(actions).toEqual(
      expect.arrayContaining(['save', 'submit', 'cancel']),
    );
  });

  it('offers finance approve on finance_review', () => {
    const actions = resolvePettyCashRequestActions(
      { status: PettyCashRequirementStatus.FinanceReview },
      fullCaps,
    );
    expect(actions).toContain('finance_approve');
  });
});
