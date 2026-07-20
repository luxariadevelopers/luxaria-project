import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { canProcessRefund } from './refundMath';
import type { BankAccountOption, PublicBookingCancellation } from './types';
import { useProcessCancellationRefund } from './useBookingCancellations';
import {
  processRefundSchema,
  type ProcessRefundFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  row: PublicBookingCancellation | null;
  bankAccounts: readonly BankAccountOption[];
  canViewBankAccounts: boolean;
};

/**
 * Nest `POST …/process-refund` — `collection.refund`.
 * Posts the refund journal; blocked until status is approved.
 */
export function ProcessRefundDialog({
  open,
  onClose,
  row,
  bankAccounts,
  canViewBankAccounts,
}: Props) {
  const processRefund = useProcessCancellationRefund();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<ProcessRefundFormValues>({
    resolver: zodResolver(processRefundSchema),
    defaultValues: {
      refundBankAccountId: '',
      refundTransactionId: '',
      refundDate: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const gate = row
    ? canProcessRefund({
        status: row.status,
        approvedRefund: row.approvedRefund,
      })
    : { ok: false as const, message: 'No cancellation selected' };

  const onSubmit = async (values: ProcessRefundFormValues) => {
    if (!row || !gate.ok) return;
    try {
      await processRefund.mutateAsync({
        id: row.id,
        input: {
          refundBankAccountId: values.refundBankAccountId,
          refundTransactionId: values.refundTransactionId.trim(),
          refundDate: values.refundDate,
        },
      });
      success('Refund processed and journal posted');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <DialogTitle>Process refund</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {row ? (
              <Typography variant="body2" color="text.secondary">
                Pay {formatInr(row.approvedRefund)} for{' '}
                {row.cancellationNumber}. Unapproved refunds are rejected by
                Nest.
              </Typography>
            ) : null}
            {!gate.ok ? (
              <Typography color="error" variant="body2">
                {gate.message}
              </Typography>
            ) : null}
            {!canViewBankAccounts ? (
              <Typography color="warning.main" variant="body2">
                bank.view is required to select the refund bank account.
              </Typography>
            ) : (
              <FormSelect
                name="refundBankAccountId"
                control={control}
                label="Refund bank account"
                options={bankAccounts.map((b) => ({
                  value: b.id,
                  label: b.label,
                }))}
              />
            )}
            <FormTextField
              name="refundTransactionId"
              control={control}
              label="Refund transaction id"
              required
            />
            <FormTextField
              name="refundDate"
              control={control}
              label="Refund date"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              processRefund.isPending ||
              !gate.ok ||
              !canViewBankAccounts ||
              bankAccounts.length === 0
            }
          >
            Process &amp; post
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
