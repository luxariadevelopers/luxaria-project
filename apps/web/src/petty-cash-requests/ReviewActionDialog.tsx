import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { MoneyInput } from '@/components/forms';
import {
  Controller,
  useForm,
  type Control,
} from 'react-hook-form';

type ReviewFormValues = {
  comment: string;
  approvedAmount: number;
};

type Props = {
  open: boolean;
  title: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (values: {
    comment?: string;
    approvedAmount?: number;
  }) => void | Promise<void>;
  loading?: boolean;
  /** When true, show approved-amount field (finance approve). */
  showApprovedAmount?: boolean;
  defaultApprovedAmount?: number;
};

/**
 * Shared comment dialog for PM/finance approve, reject, and return.
 */
export function ReviewActionDialog({
  open,
  title,
  confirmLabel,
  onClose,
  onConfirm,
  loading = false,
  showApprovedAmount = false,
  defaultApprovedAmount = 0,
}: Props) {
  const { control, handleSubmit, reset } = useForm<ReviewFormValues>({
    defaultValues: {
      comment: '',
      approvedAmount: defaultApprovedAmount,
    },
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      reset({
        comment: '',
        approvedAmount: defaultApprovedAmount,
      });
    }
  }, [open, defaultApprovedAmount, reset]);

  const busy = loading || submitting;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="petty-cash-review-dialog"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="pcr-review-form"
          spacing={2}
          sx={{ pt: 1 }}
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit(async (values) => {
              setSubmitting(true);
              try {
                await onConfirm({
                  comment: values.comment.trim() || undefined,
                  approvedAmount: showApprovedAmount
                    ? values.approvedAmount
                    : undefined,
                });
                onClose();
              } finally {
                setSubmitting(false);
              }
            })();
          }}
        >
          <Controller
            name="comment"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Comment"
                multiline
                minRows={2}
                fullWidth
                disabled={busy}
              />
            )}
          />
          {showApprovedAmount ? (
            <ApprovedAmountField control={control} disabled={busy} />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="pcr-review-form"
          variant="contained"
          disabled={busy}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ApprovedAmountField({
  control,
  disabled,
}: {
  control: Control<ReviewFormValues>;
  disabled: boolean;
}) {
  return (
    <MoneyInput
      name="approvedAmount"
      control={control}
      label="Approved amount"
      disabled={disabled}
      fullWidth
      helperText="May differ from the requested total (Nest finance step)."
    />
  );
}
