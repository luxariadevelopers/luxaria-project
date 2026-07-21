import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LifecycleConfirmationDialog } from './LifecycleConfirmationDialog';
import {
  UnlockDecisionDialog,
} from './UnlockDialogs';
import {
  FinancialYearStatus,
  UnlockRequestStatus,
  type PublicFinancialYear,
  type PublicFinancialYearUnlockRequest,
} from './types';

const financialYear: PublicFinancialYear = {
  id: '507f1f77bcf86cd799439011',
  companyId: '507f1f77bcf86cd799439012',
  name: 'FY 2026-27',
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2027-03-31T23:59:59.999Z',
  status: FinancialYearStatus.Open,
  isCurrent: false,
  isLocked: false,
  lockedAt: null,
  lockedBy: null,
};

const unlockRequest: PublicFinancialYearUnlockRequest = {
  id: '507f1f77bcf86cd799439013',
  financialYearId: financialYear.id,
  reason: 'Correct a misposted March journal',
  requestedBy: 'requester-1',
  status: UnlockRequestStatus.Pending,
  approvedBy: null,
  approvedAt: null,
  approvalNote: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
};

describe('financial year lifecycle confirmations', () => {
  it('requires the exact financial-year name before locking', () => {
    const onConfirm = vi.fn();
    render(
      <LifecycleConfirmationDialog
        open
        action="lock"
        financialYear={financialYear}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId('lock-financial-year-confirm');
    expect(confirm).toBeDisabled();
    expect(
      screen.getByText(/rejects accounting postings/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Confirmation'), {
      target: { value: 'FY 2026' },
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Confirmation'), {
      target: { value: 'FY 2026-27' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks self-approval even when the approval phrase matches', () => {
    const onApprove = vi.fn();
    render(
      <UnlockDecisionDialog
        open
        decision="approve"
        request={unlockRequest}
        currentUserId="requester-1"
        onApprove={onApprove}
        onReject={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/different approver/i)).toBeInTheDocument();
    const confirm = screen.getByTestId(
      'approve-financial-year-unlock-confirm',
    );
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('APPROVE confirmation'), {
      target: { value: 'APPROVE' },
    });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);

    expect(onApprove).not.toHaveBeenCalled();
  });

  it('allows a different approver after exact confirmation', () => {
    const onApprove = vi.fn();
    render(
      <UnlockDecisionDialog
        open
        decision="approve"
        request={unlockRequest}
        currentUserId="approver-1"
        onApprove={onApprove}
        onReject={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('APPROVE confirmation'), {
      target: { value: 'APPROVE' },
    });
    fireEvent.click(
      screen.getByTestId('approve-financial-year-unlock-confirm'),
    );

    expect(onApprove).toHaveBeenCalledWith({ approvalNote: undefined });
  });
});
