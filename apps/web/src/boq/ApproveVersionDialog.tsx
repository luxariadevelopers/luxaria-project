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
import { FormTextField } from '@/components/forms';
import { formatBoqVersionLabel } from './labels';
import type { PublicBoqVersion } from './types';
import {
  approveBoqVersionSchema,
  type ApproveBoqVersionFormValues,
} from './validation';

type Props = {
  open: boolean;
  version: PublicBoqVersion | null;
  onClose: () => void;
  onSubmit: (values: ApproveBoqVersionFormValues) => Promise<void>;
  submitting?: boolean;
};

export function ApproveVersionDialog({
  open,
  version,
  onClose,
  onSubmit,
  submitting = false,
}: Props) {
  const { control, handleSubmit, reset } =
    useForm<ApproveBoqVersionFormValues>({
      resolver: zodResolver(approveBoqVersionSchema),
      defaultValues: { approvalReference: '', comment: '' },
    });

  useEffect(() => {
    if (!open) reset({ approvalReference: '', comment: '' });
  }, [open, reset]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Approve BOQ version</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
          component="form"
          id="approve-boq-version-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          {version && (
            <Typography variant="body2" color="text.secondary">
              Approving {formatBoqVersionLabel(version)} sets it active and
              supersedes the previous active version (one active per project).
            </Typography>
          )}
          <FormTextField
            name="approvalReference"
            control={control}
            label="Approval reference"
            required
          />
          <FormTextField
            name="comment"
            control={control}
            label="Comment"
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="approve-boq-version-form"
          variant="contained"
          disabled={submitting}
        >
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
