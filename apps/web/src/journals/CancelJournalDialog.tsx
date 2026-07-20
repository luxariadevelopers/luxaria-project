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
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicJournalEntry } from './types';
import { useCancelJournal } from './useJournals';
import {
  cancelJournalSchema,
  type CancelJournalFormValues,
} from './actionValidation';

type Props = {
  open: boolean;
  onClose: () => void;
  journal: PublicJournalEntry | null;
  onCancelled: () => void;
};

export function CancelJournalDialog({
  open,
  onClose,
  journal,
  onCancelled,
}: Props) {
  const cancel = useCancelJournal();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<CancelJournalFormValues>({
    resolver: zodResolver(cancelJournalSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) {
      reset({ reason: '' });
    }
  }, [open, reset]);

  const onSubmit = async (values: CancelJournalFormValues) => {
    if (!journal) return;
    try {
      await cancel.mutateAsync({
        id: journal.id,
        input: { reason: values.reason?.trim() || undefined },
      });
      success('Journal cancelled');
      onCancelled();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="cancel-journal-dialog"
    >
      <DialogTitle>Cancel {journal?.journalNumber}</DialogTitle>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires journal.create (Nest has no journal.cancel). Only draft or
            pending-approval journals can be cancelled.
          </Typography>
          <FormTextField
            name="reason"
            control={control}
            label="Cancellation reason (optional)"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={cancel.isPending}>
            Back
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={cancel.isPending}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel journal'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
