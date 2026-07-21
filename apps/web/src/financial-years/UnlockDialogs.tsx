import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { ErrorAlert } from '@/components/errors';
import type {
  ApproveFinancialYearUnlockInput,
  PublicFinancialYear,
  PublicFinancialYearUnlockRequest,
  RejectFinancialYearUnlockInput,
  RequestFinancialYearUnlockInput,
} from './types';
import {
  unlockRejectionSchema,
  unlockRequestSchema,
} from './validation';

type RequestDialogProps = {
  open: boolean;
  financialYear: PublicFinancialYear | null;
  loading?: boolean;
  error?: unknown;
  onSubmit: (input: RequestFinancialYearUnlockInput) => Promise<void> | void;
  onClose: () => void;
};

export function RequestUnlockDialog({
  open,
  financialYear,
  loading = false,
  error,
  onSubmit,
  onClose,
}: RequestDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setValidationError(null);
    }
  }, [open, financialYear?.id]);

  if (!financialYear) return null;

  const submit = () => {
    const parsed = unlockRequestSchema.safeParse({ reason });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Enter a reason');
      return;
    }
    setValidationError(null);
    void onSubmit(parsed.data);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      data-testid="request-financial-year-unlock-dialog"
    >
      <DialogTitle>Request financial year unlock</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="info" variant="outlined">
            This does not unlock {financialYear.name}. It submits a pending
            request for a different user with financial_year.unlock to review.
          </Alert>
          <TextField
            autoFocus
            label="Reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setValidationError(null);
            }}
            error={Boolean(validationError)}
            helperText={
              validationError ??
              'Explain the correction needed (minimum 10 characters).'
            }
            multiline
            minRows={3}
            fullWidth
            disabled={loading}
          />
          {error ? <ErrorAlert error={error} showDetails /> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Submitting…' : 'Submit unlock request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export type UnlockDecision = 'approve' | 'reject';

type DecisionDialogProps = {
  open: boolean;
  decision: UnlockDecision;
  request: PublicFinancialYearUnlockRequest | null;
  currentUserId?: string | null;
  loading?: boolean;
  error?: unknown;
  onApprove: (
    input: ApproveFinancialYearUnlockInput,
  ) => Promise<void> | void;
  onReject: (
    input: RejectFinancialYearUnlockInput,
  ) => Promise<void> | void;
  onClose: () => void;
};

export function UnlockDecisionDialog({
  open,
  decision,
  request,
  currentUserId,
  loading = false,
  error,
  onApprove,
  onReject,
  onClose,
}: DecisionDialogProps) {
  const [confirmation, setConfirmation] = useState('');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfirmation('');
      setNote('');
      setValidationError(null);
    }
  }, [open, decision, request?.id]);

  if (!request) return null;

  const isApprove = decision === 'approve';
  const requiredPhrase = isApprove ? 'APPROVE' : 'REJECT';
  const isRequester =
    Boolean(currentUserId) && request.requestedBy === currentUserId;

  const submit = () => {
    if (confirmation !== requiredPhrase) return;
    if (isApprove) {
      if (isRequester) {
        setValidationError(
          'The requester cannot approve their own unlock request.',
        );
        return;
      }
      setValidationError(null);
      void onApprove({ approvalNote: note.trim() || undefined });
      return;
    }
    const parsed = unlockRejectionSchema.safeParse({
      rejectionReason: note,
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? 'Enter a rejection reason',
      );
      return;
    }
    setValidationError(null);
    void onReject(parsed.data);
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      data-testid={`${decision}-financial-year-unlock-dialog`}
    >
      <DialogTitle>
        {isApprove ? 'Approve unlock request' : 'Reject unlock request'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert
            severity={isApprove ? 'warning' : 'error'}
            variant="outlined"
          >
            {isApprove
              ? 'Approval immediately unlocks the financial year and permits postings again. The requester and approver must be different users.'
              : 'Rejection keeps the financial year locked and permanently records the rejection reason.'}
          </Alert>
          {isApprove && isRequester ? (
            <Alert severity="error">
              You submitted this request. A different approver must complete
              this action.
            </Alert>
          ) : null}
          <DialogContentText>
            Request reason: {request.reason}
          </DialogContentText>
          <TextField
            label={
              isApprove ? 'Approval note (optional)' : 'Rejection reason'
            }
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setValidationError(null);
            }}
            error={Boolean(validationError)}
            helperText={
              validationError ??
              (isApprove
                ? 'This note is recorded with the approval.'
                : 'Minimum 5 characters.')
            }
            multiline
            minRows={2}
            fullWidth
            disabled={loading}
          />
          <DialogContentText>
            Type <strong>{requiredPhrase}</strong> exactly to confirm.
          </DialogContentText>
          <TextField
            label="Confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            fullWidth
            disabled={loading}
            slotProps={{
              htmlInput: { 'aria-label': `${requiredPhrase} confirmation` },
            }}
          />
          {error ? <ErrorAlert error={error} showDetails /> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isApprove ? 'warning' : 'error'}
          disabled={
            confirmation !== requiredPhrase ||
            loading ||
            (isApprove && isRequester)
          }
          onClick={submit}
          data-testid={`${decision}-financial-year-unlock-confirm`}
        >
          {loading
            ? isApprove
              ? 'Approving…'
              : 'Rejecting…'
            : isApprove
              ? 'Approve and unlock'
              : 'Reject request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
