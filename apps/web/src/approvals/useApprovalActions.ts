import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getErrorMessage,
  isConflictError,
  isForbiddenError,
} from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  approveApproval,
  cancelApproval,
  rejectApproval,
  returnApproval,
  type ApprovalActionBody,
  type CancelApprovalBody,
} from './api';
import {
  APPROVALS_QUERY_KEY,
  approvalDetailQueryKey,
  approvalsPendingCountQueryKey,
} from './queryKeys';
import type { PublicApprovalRequest } from './types';

type Args = {
  projectId: string;
  approvalId: string;
};

/**
 * Approval mutations — **no optimistic updates**.
 * Server response (or refetch after conflict) is the source of truth.
 */
export function useApprovalActions({ projectId, approvalId }: Args) {
  const queryClient = useQueryClient();
  const { success, error: notifyError, warning } = useNotify();

  const invalidateRelated = async (approval?: PublicApprovalRequest) => {
    if (approval) {
      queryClient.setQueryData(
        approvalDetailQueryKey(projectId, approvalId),
        approval,
      );
    } else {
      await queryClient.invalidateQueries({
        queryKey: approvalDetailQueryKey(projectId, approvalId),
      });
    }
    await queryClient.invalidateQueries({
      queryKey: [...APPROVALS_QUERY_KEY, 'list', projectId],
    });
    await queryClient.invalidateQueries({
      queryKey: approvalsPendingCountQueryKey(projectId),
    });
    await queryClient.invalidateQueries({
      queryKey: ['approvals', 'timeline', projectId, approvalId],
    });
  };

  const handleError = async (err: unknown, fallback: string) => {
    if (isConflictError(err)) {
      warning(
        getErrorMessage(
          err,
          'This approval changed. Refreshing the latest state…',
        ),
      );
      await invalidateRelated();
      return;
    }
    if (isForbiddenError(err)) {
      notifyError(
        getErrorMessage(
          err,
          'You cannot perform this action (permission, eligibility, or self-approval).',
        ),
      );
      await invalidateRelated();
      return;
    }
    notifyError(getErrorMessage(err, fallback));
  };

  const approve = useMutation({
    mutationFn: (body: ApprovalActionBody) =>
      approveApproval(projectId, approvalId, body),
    onSuccess: async (result) => {
      // Apply server payload only after success — never optimistic.
      await invalidateRelated(result.approval);
      success(result.message || 'Approved');
    },
    onError: (err) => void handleError(err, 'Approve failed'),
  });

  const reject = useMutation({
    mutationFn: (body: ApprovalActionBody) =>
      rejectApproval(projectId, approvalId, body),
    onSuccess: async (result) => {
      await invalidateRelated(result.approval);
      success(result.message || 'Rejected');
    },
    onError: (err) => void handleError(err, 'Reject failed'),
  });

  const returnForCorrection = useMutation({
    mutationFn: (body: ApprovalActionBody) =>
      returnApproval(projectId, approvalId, body),
    onSuccess: async (result) => {
      await invalidateRelated(result.approval);
      success(result.message || 'Returned for correction');
    },
    onError: (err) => void handleError(err, 'Return failed'),
  });

  const cancel = useMutation({
    mutationFn: (body: CancelApprovalBody) =>
      cancelApproval(projectId, approvalId, body),
    onSuccess: async (result) => {
      await invalidateRelated(result.approval);
      success(result.message || 'Cancelled');
    },
    onError: (err) => void handleError(err, 'Cancel failed'),
  });

  const isPending =
    approve.isPending ||
    reject.isPending ||
    returnForCorrection.isPending ||
    cancel.isPending;

  return {
    approve,
    reject,
    returnForCorrection,
    cancel,
    isPending,
  };
}
