import { SiteExpenseVoucherStatus } from '../types';
import { resolveExpenseDetailActions } from '../workflowActions';
import type { ExpenseCapabilities } from '../permissions';

const fullCaps: ExpenseCapabilities = {
  canView: true,
  canCreate: true,
  canApprove: true,
  canPost: true,
  canVerify: true,
  canCancel: true,
};

describe('resolveExpenseDetailActions', () => {
  it('offers submit for draft/returned', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Draft },
        fullCaps,
      ),
    ).toEqual(['submit', 'cancel']);
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Returned },
        fullCaps,
      ),
    ).toEqual(['submit', 'cancel']);
  });

  it('offers verify/reject/return for submitted', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Submitted },
        fullCaps,
      ),
    ).toEqual(['verify', 'reject', 'return', 'cancel']);
  });

  it('offers approve/reject/return for verified', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Verified },
        fullCaps,
      ),
    ).toEqual(['approve', 'reject', 'return', 'cancel']);
  });

  it('offers post for approved when canPost', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Approved },
        fullCaps,
      ),
    ).toEqual(['post', 'cancel']);
  });

  it('offers no review actions without permissions', () => {
    expect(
      resolveExpenseDetailActions(
        { status: SiteExpenseVoucherStatus.Submitted },
        {
          ...fullCaps,
          canApprove: false,
          canVerify: false,
          canPost: false,
          canCancel: false,
        },
      ),
    ).toEqual([]);
  });
});
