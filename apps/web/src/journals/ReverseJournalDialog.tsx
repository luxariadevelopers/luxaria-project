import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatDate } from '@/format';
import {
  isLockedPeriodError,
  lockedPeriodUserMessage,
} from './lockedPeriodError';
import type { PublicJournalEntry } from './types';
import { useReverseJournal } from './useJournals';
import {
  reverseJournalSchema,
  type ReverseJournalFormValues,
} from './actionValidation';

type Props = {
  open: boolean;
  onClose: () => void;
  journal: PublicJournalEntry | null;
  onReversed: (reversalId: string) => void;
};

function toDateInputValue(iso: string): string {
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

export function ReverseJournalDialog({
  open,
  onClose,
  journal,
  onReversed,
}: Props) {
  const reverse = useReverseJournal();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<ReverseJournalFormValues>({
    resolver: zodResolver(reverseJournalSchema),
    defaultValues: {
      journalDate: '',
      narration: '',
    },
  });

  useEffect(() => {
    if (!open || !journal) return;
    reset({
      journalDate: toDateInputValue(journal.journalDate),
      narration: `Reversal of ${journal.journalNumber}: ${journal.narration}`,
    });
  }, [open, journal, reset]);

  const onSubmit = async (values: ReverseJournalFormValues) => {
    if (!journal) return;
    try {
      const result = await reverse.mutateAsync({
        id: journal.id,
        input: {
          journalDate: values.journalDate,
          narration: values.narration,
        },
      });
      success(`Reversing entry ${result.reversal.journalNumber} posted`);
      onReversed(result.reversal.id);
      onClose();
    } catch (err) {
      if (isLockedPeriodError(err)) {
        notifyError(lockedPeriodUserMessage(err));
      } else {
        notifyError(getErrorMessage(err));
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="reverse-journal-dialog"
    >
      <DialogTitle>Reverse {journal?.journalNumber}</DialogTitle>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Requires journal.reverse. Creates a new posted reversing journal
            (debit/credit swapped). Original becomes reversed and stays
            immutable. Original date:{' '}
            {journal ? formatDate(journal.journalDate) : '—'}.
          </Typography>
          <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            Locked or closed financial years reject posting (Nest 403).
          </Alert>
          <Controller
            name="journalDate"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                type="date"
                label="Reversal date"
                required
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ mb: 2 }}
              />
            )}
          />
          <FormTextField
            name="narration"
            control={control}
            label="Reversal reason"
            required
            multiline
            minRows={2}
            helperText="Sent as Nest reverse narration"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={reverse.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="warning"
            disabled={reverse.isPending}
          >
            {reverse.isPending ? 'Reversing…' : 'Reverse'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
