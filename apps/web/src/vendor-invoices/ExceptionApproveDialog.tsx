import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { FormTextField } from '@/components/forms/FormTextField';
import {
  exceptionApproveSchema,
  type ExceptionApproveFormValues,
} from './validation';
import { VendorInvoiceMatchingStatus } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  matchingStatus: string;
  loading?: boolean;
  onConfirm: (comment: string | null) => void;
};

/**
 * Nest `POST …/approve` — comment required when matchingStatus is exception.
 */
export function ExceptionApproveDialog({
  open,
  onClose,
  matchingStatus,
  loading,
  onConfirm,
}: Props) {
  const needsComment =
    matchingStatus === VendorInvoiceMatchingStatus.Exception;

  const { control, handleSubmit, reset } = useForm<ExceptionApproveFormValues>({
    resolver: zodResolver(exceptionApproveSchema),
    defaultValues: { exceptionApprovalComment: '' },
  });

  const submit = handleSubmit((values) => {
    onConfirm(
      needsComment ? values.exceptionApprovalComment.trim() : null,
    );
    reset();
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Approve vendor invoice</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="exception-approve-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Moves Matching → Approval. Exceptions require
            exceptionApprovalComment (vendor_invoice.approve).
          </Typography>
          {needsComment ? (
            <FormTextField
              name="exceptionApprovalComment"
              control={control}
              label="Exception approval comment"
              multiline
              minRows={3}
              required
            />
          ) : (
            <Typography variant="body2">
              Matching is clean or within tolerance — no exception comment
              required.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {needsComment ? (
          <Button
            type="submit"
            form="exception-approve-form"
            variant="contained"
            disabled={loading}
          >
            Approve with exception
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={loading}
            onClick={() => onConfirm(null)}
          >
            Approve
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
