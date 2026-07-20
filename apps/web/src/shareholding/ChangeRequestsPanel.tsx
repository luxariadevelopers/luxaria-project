import { useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  getErrorMessage,
  isConflictError,
  isForbiddenError,
} from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDateTime } from '@/format';
import {
  approveShareholdingChange,
  rejectShareholdingChange,
} from '@/directors/api';
import { formatShareholdingPercent } from '@/directors/shareholdingDisplay';
import {
  ShareholdingChangeStatus,
  type PublicShareholdingChangeRequest,
} from '@/directors/types';
import { assessTotalPercentage, sumHoldingPercentages } from './totalPercentage';

type Props = {
  items: PublicShareholdingChangeRequest[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onChanged: () => void;
  canView: boolean;
  canApprove: boolean;
  currentUserId: string | null;
};

/**
 * Pending / recent change requests. Approve/reject require `shareholding.approve`
 * (there is no `shareholding.change` permission in the Nest catalog).
 */
export function ChangeRequestsPanel({
  items,
  loading,
  error,
  onRetry,
  onChanged,
  canView,
  canApprove,
  currentUserId,
}: Props) {
  const { success, error: notifyError, warning } = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  if (!canView) {
    return (
      <PermissionDenied
        title="Change requests unavailable"
        message="You need shareholding.view to list change requests."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    if (isForbiddenError(error)) {
      return <PermissionDenied error={error} showHomeLink={false} />;
    }
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography color="text.secondary">Loading change requests…</Typography>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No change requests"
        description="Proposals appear here when someone uses shareholding.propose."
      />
    );
  }

  return (
    <Stack spacing={1.5} data-testid="shareholding-change-requests">
      <Typography variant="subtitle2">Change requests</Typography>
      {items.map((req) => {
        const proposedTotal = sumHoldingPercentages(req.proposedHoldings);
        const assessed = assessTotalPercentage(proposedTotal);
        const isPending = req.status === ShareholdingChangeStatus.Pending;
        const isSelf = Boolean(
          currentUserId && req.requestedBy === currentUserId,
        );
        return (
          <Stack
            key={req.id}
            spacing={1}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip size="small" label={String(req.status)} />
              <Chip
                size="small"
                color={assessed.isValid ? 'success' : 'warning'}
                label={`Proposed ${formatShareholdingPercent(proposedTotal)}`}
              />
            </Stack>
            <Typography variant="body2">{req.reason}</Typography>
            <Typography variant="caption" color="text.secondary">
              Requested {req.createdAt ? formatDateTime(req.createdAt) : '—'}
              {req.approvalReference ? ` · ${req.approvalReference}` : ''}
            </Typography>
            {!assessed.isValid ? (
              <Alert severity="warning" variant="outlined">
                {assessed.message}
              </Alert>
            ) : null}

            {isPending && canApprove ? (
              <Stack spacing={1}>
                {isSelf ? (
                  <Typography variant="caption" color="warning.main">
                    You proposed this request — Nest blocks self-approval.
                  </Typography>
                ) : null}
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={busyId === req.id || isSelf}
                    onClick={() => {
                      void (async () => {
                        setBusyId(req.id);
                        try {
                          await approveShareholdingChange(req.id);
                          success('Shareholding change approved; new version recorded');
                          onChanged();
                        } catch (err) {
                          if (isConflictError(err)) {
                            warning(
                              getErrorMessage(
                                err,
                                'Conflict approving shareholding change',
                              ),
                            );
                          } else {
                            notifyError(
                              getErrorMessage(err, 'Approve failed'),
                            );
                          }
                          onChanged();
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                  >
                    Approve
                  </Button>
                  <TextField
                    size="small"
                    label="Rejection reason"
                    value={rejectReason[req.id] ?? ''}
                    onChange={(e) =>
                      setRejectReason((prev) => ({
                        ...prev,
                        [req.id]: e.target.value,
                      }))
                    }
                    sx={{ minWidth: 220 }}
                  />
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={
                      busyId === req.id ||
                      !(rejectReason[req.id]?.trim())
                    }
                    onClick={() => {
                      void (async () => {
                        setBusyId(req.id);
                        try {
                          await rejectShareholdingChange(req.id, {
                            rejectionReason: rejectReason[req.id]!.trim(),
                          });
                          success('Shareholding change rejected');
                          onChanged();
                        } catch (err) {
                          notifyError(getErrorMessage(err, 'Reject failed'));
                        } finally {
                          setBusyId(null);
                        }
                      })();
                    }}
                  >
                    Reject
                  </Button>
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        );
      })}
    </Stack>
  );
}
