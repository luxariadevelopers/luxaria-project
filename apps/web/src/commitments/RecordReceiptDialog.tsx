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
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import type { PublicCommitment } from './types';
import { useRecordCommitmentReceipt } from './useCommitments';

const schema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  receivedAt: z.string(),
  reference: z.string(),
  remarks: z.string(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  commitment: PublicCommitment | null;
  onRecorded: () => void;
};

export function RecordReceiptDialog({
  open,
  onClose,
  projectId,
  commitment,
  onRecorded,
}: Props) {
  const record = useRecordCommitmentReceipt(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      amount: 0,
      receivedAt: '',
      reference: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        amount: 0,
        receivedAt: '',
        reference: '',
        remarks: '',
      });
    }
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!commitment) return;
    try {
      await record.mutateAsync({
        id: commitment.id,
        input: {
          amount: values.amount,
          receivedAt: values.receivedAt.trim() || undefined,
          reference: values.reference.trim() || null,
          remarks: values.remarks.trim() || null,
        },
      });
      success('Receipt recorded');
      onRecorded();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Record receipt</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pending on {commitment?.commitmentNumber ?? '—'}:{' '}
          {commitment ? formatInr(commitment.pendingAmount) : '—'}
        </Typography>
        <form
          id="record-receipt-form"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <FormTextField
            name="amount"
            control={control}
            label="Amount"
            type="number"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="receivedAt"
            control={control}
            label="Received at (YYYY-MM-DD, optional)"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="reference"
            control={control}
            label="Reference"
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="remarks"
            control={control}
            label="Remarks"
            multiline
            minRows={2}
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={record.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="record-receipt-form"
          variant="contained"
          disabled={record.isPending || !commitment}
        >
          Record
        </Button>
      </DialogActions>
    </Dialog>
  );
}
