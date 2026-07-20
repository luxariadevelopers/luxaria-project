import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormTextField } from '@/components/forms/FormTextField';
import {
  cancelExpenseSchema,
  rejectExpenseSchema,
  returnExpenseSchema,
  type CancelExpenseFormValues,
  type RejectExpenseFormValues,
  type ReturnExpenseFormValues,
} from './validation';

export type ExpenseDialogMode = 'reject' | 'return' | 'cancel';

type Props = {
  open: boolean;
  mode: ExpenseDialogMode | null;
  voucherNumber?: string;
  loading?: boolean;
  onClose: () => void;
  onReject: (reason: string) => void | Promise<void>;
  onReturn: (comment?: string) => void | Promise<void>;
  onCancel: (cancellationReason: string) => void | Promise<void>;
};

/**
 * Comment / reason dialogs for reject, return, and cancel.
 * Reject requires comments (`reason`); cancel requires cancellation reason
 * (prompt “reversal reason” — Nest has no expense reverse).
 */
export function ExpenseActionDialog({
  open,
  mode,
  voucherNumber,
  loading = false,
  onClose,
  onReject,
  onReturn,
  onCancel,
}: Props) {
  const rejectForm = useForm<RejectExpenseFormValues>({
    resolver: zodResolver(rejectExpenseSchema),
    defaultValues: { reason: '' },
  });
  const returnForm = useForm<ReturnExpenseFormValues>({
    resolver: zodResolver(returnExpenseSchema),
    defaultValues: { comment: '' },
  });
  const cancelForm = useForm<CancelExpenseFormValues>({
    resolver: zodResolver(cancelExpenseSchema),
    defaultValues: { cancellationReason: '' },
  });

  useEffect(() => {
    if (!open) return;
    rejectForm.reset({ reason: '' });
    returnForm.reset({ comment: '' });
    cancelForm.reset({ cancellationReason: '' });
  }, [open, mode, rejectForm, returnForm, cancelForm]);

  const title =
    mode === 'reject'
      ? `Reject ${voucherNumber ?? 'voucher'}`
      : mode === 'return'
        ? `Return ${voucherNumber ?? 'voucher'}`
        : mode === 'cancel'
          ? `Cancel ${voucherNumber ?? 'voucher'}`
          : 'Expense action';

  const confirmLabel =
    mode === 'reject'
      ? 'Reject'
      : mode === 'return'
        ? 'Return'
        : mode === 'cancel'
          ? 'Cancel voucher'
          : 'Confirm';

  return (
    <Dialog
      open={open && mode != null}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="expense-action-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      {mode === 'reject' ? (
        <form
          onSubmit={(e) => {
            void rejectForm.handleSubmit(async (values) => {
              await onReject(values.reason.trim());
            })(e);
          }}
        >
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Comments are required. Nest field: <code>reason</code> (
              <code>expense.approve</code>).
            </Typography>
            <FormTextField
              name="reason"
              control={rejectForm.control}
              label="Comments"
              multiline
              minRows={3}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={loading}>
              Back
            </Button>
            <Button
              type="submit"
              color="error"
              variant="contained"
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </form>
      ) : null}

      {mode === 'return' ? (
        <form
          onSubmit={(e) => {
            void returnForm.handleSubmit(async (values) => {
              await onReturn(values.comment?.trim() || undefined);
            })(e);
          }}
        >
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Optional comment for the submitter (
              <code>expense.approve</code>).
            </Typography>
            <FormTextField
              name="comment"
              control={returnForm.control}
              label="Comment (optional)"
              multiline
              minRows={3}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={loading}>
              Back
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {confirmLabel}
            </Button>
          </DialogActions>
        </form>
      ) : null}

      {mode === 'cancel' ? (
        <form
          onSubmit={(e) => {
            void cancelForm.handleSubmit(async (values) => {
              await onCancel(values.cancellationReason.trim());
            })(e);
          }}
        >
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Cancellation reason is required. Posted vouchers cannot be
              cancelled (immutable). Nest has no <code>expense.reverse</code>.
            </Typography>
            <FormTextField
              name="cancellationReason"
              control={cancelForm.control}
              label="Cancellation reason"
              multiline
              minRows={3}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={loading}>
              Back
            </Button>
            <Button
              type="submit"
              color="error"
              variant="outlined"
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </form>
      ) : null}
    </Dialog>
  );
}
