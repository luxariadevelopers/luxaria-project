import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import type { CashBalanceView, PublicCashAccount } from './types';
import { useCloseCashAccount } from './useCashAccounts';
import {
  closeCashAccountSchema,
  type CloseCashAccountFormValues,
} from './validation';
import { canCloseWithBalance } from './workflowActions';

type Props = {
  open: boolean;
  onClose: () => void;
  account: PublicCashAccount | null;
  balance?: CashBalanceView | null;
};

export function CloseCashAccountDialog({
  open,
  onClose,
  account,
  balance,
}: Props) {
  const closeMut = useCloseCashAccount();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<CloseCashAccountFormValues>({
      resolver: zodResolver(closeCashAccountSchema),
      defaultValues: { reason: '' },
    });

  useEffect(() => {
    if (!open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  const preview = canCloseWithBalance(balance?.currentBalance);

  const onSubmit = async (values: CloseCashAccountFormValues) => {
    if (!account) return;
    if (!preview.ok) {
      notifyError(preview.message);
      return;
    }
    try {
      await closeMut.mutateAsync({
        id: account.id,
        input: { reason: values.reason?.trim() || undefined },
      });
      success('Cash account closed');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Close {account?.accountCode}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nest requires zero system balance and no open handover
            (`cash.manage`).
          </Typography>
          {balance ? (
            <Alert
              severity={preview.ok ? 'info' : 'error'}
              variant="outlined"
              sx={{ mb: 2 }}
            >
              Current balance {formatInr(balance.currentBalance)}.
              {!preview.ok
                ? ' Close is blocked until the balance is cleared.'
                : ' Balance is zero — close is allowed.'}
            </Alert>
          ) : null}
          <FormTextField
            name="reason"
            control={control}
            label="Close reason (optional)"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={closeMut.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={closeMut.isPending || !preview.ok}
          >
            {closeMut.isPending ? 'Closing…' : 'Close account'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
