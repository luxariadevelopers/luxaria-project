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
import {
  validateApprovalAction,
  type ApprovalActionKind,
} from './validateAction';

type Props = {
  open: boolean;
  kind: ApprovalActionKind | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (comment: string | null) => void;
};

const TITLES: Record<ApprovalActionKind, string> = {
  approve: 'Approve request',
  reject: 'Reject request',
  return: 'Return for correction',
  cancel: 'Cancel request',
};

const HINTS: Record<ApprovalActionKind, string> = {
  approve: 'Optional comment for the approval history.',
  reject: 'A comment is required explaining the rejection.',
  return: 'A comment is required explaining what to correct.',
  cancel: 'Optional reason for cancellation.',
};

/**
 * Confirm dialog for approve / reject / return / cancel.
 * Does not mutate server state — parent runs the API after validation.
 */
export function ApprovalActionDialog({
  open,
  kind,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setComment('');
      setError(null);
    }
  }, [open, kind]);

  if (!kind) {
    return null;
  }

  const commentRequired = kind === 'reject' || kind === 'return';

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{TITLES[kind]}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {HINTS[kind]}
        </Typography>
        <TextField
          autoFocus
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
            const validated = validateApprovalAction({ kind, comment });
            if (validated.fieldErrors.comment) {
              setError(validated.fieldErrors.comment);
              return;
            }
            onConfirm(validated.comment);
          }}
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
