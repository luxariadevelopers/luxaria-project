import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import type { PublicPettyCashRequirement } from './types';

export type RequestActionKind =
  | 'submit'
  | 'pm_approve'
  | 'finance_approve'
  | 'reject'
  | 'return'
  | 'fund'
  | 'close'
  | 'cancel';

export type RequestActionPayload = {
  comment?: string;
  approvedAmount?: number;
  fundedAmount?: number;
};

type Props = {
  open: boolean;
  kind: RequestActionKind | null;
  row: PublicPettyCashRequirement | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: RequestActionPayload) => void;
};

const TITLES: Record<RequestActionKind, string> = {
  submit: 'Submit for approval',
  pm_approve: 'Project manager review',
  finance_approve: 'Finance approve',
  reject: 'Reject request',
  return: 'Return for correction',
  fund: 'Mark as funded',
  close: 'Close funded request',
  cancel: 'Cancel request',
};

/**
 * Confirm dialog for list workflow actions.
 * Finance approve / fund accept optional amount overrides (Nest defaults).
 */
export function RequestActionDialog({
  open,
  kind,
  row,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [comment, setComment] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && row && kind) {
      setComment('');
      setError(null);
      if (kind === 'finance_approve') {
        setAmount(String(row.requestedAmount));
      } else if (kind === 'fund') {
        setAmount(String(row.approvedAmount ?? row.requestedAmount));
      } else {
        setAmount('');
      }
    }
  }, [open, kind, row]);

  if (!kind || !row) {
    return null;
  }

  const commentRequired = kind === 'reject' || kind === 'return';
  const showAmount = kind === 'finance_approve' || kind === 'fund';
  const showComment =
    kind === 'pm_approve' ||
    kind === 'finance_approve' ||
    kind === 'reject' ||
    kind === 'return';

  const unsettledHint =
    row.previousUnsettledAmount > 0
      ? `Previous unsettled cash: ${formatInr(row.previousUnsettledAmount)}.`
      : null;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="petty-cash-request-action-dialog"
    >
      <DialogTitle>{TITLES[kind]}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {row.requestNumber} · requested {formatInr(row.requestedAmount)}
        </Typography>
        {unsettledHint ? (
          <Typography
            variant="body2"
            color="warning.main"
            sx={{ mb: 2 }}
            data-testid="action-dialog-unsettled-hint"
          >
            {unsettledHint}
          </Typography>
        ) : null}
        {row.warnings.length > 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {row.warnings.join(' · ')}
          </Typography>
        ) : null}
        {showAmount ? (
          <TextField
            fullWidth
            type="number"
            label={
              kind === 'finance_approve' ? 'Approved amount' : 'Funded amount'
            }
            value={amount}
            disabled={loading}
            sx={{ mb: 2 }}
            slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
          />
        ) : null}
        {showComment ? (
          <TextField
            autoFocus={!showAmount}
            fullWidth
            multiline
            minRows={3}
            label={commentRequired ? 'Comment (required)' : 'Comment (optional)'}
            value={comment}
            error={Boolean(error)}
            helperText={error}
            disabled={loading}
            onChange={(e) => {
              setComment(e.target.value);
              setError(null);
            }}
          />
        ) : null}
        {error && !showComment ? (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={
            kind === 'reject' || kind === 'cancel'
              ? 'error'
              : kind === 'return'
                ? 'warning'
                : 'primary'
          }
          disabled={loading}
          onClick={() => {
            if (commentRequired && !comment.trim()) {
              setError('A comment is required.');
              return;
            }
            const payload: RequestActionPayload = {};
            if (showComment && comment.trim()) {
              payload.comment = comment.trim();
            }
            if (showAmount) {
              const parsed = Number(amount);
              if (!Number.isFinite(parsed) || parsed < 0) {
                setError('Amount must be a non-negative number.');
                return;
              }
              if (kind === 'finance_approve') {
                payload.approvedAmount = parsed;
              } else {
                payload.fundedAmount = parsed;
              }
            }
            onConfirm(payload);
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
