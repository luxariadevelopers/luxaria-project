import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import type { PublicContractorRecovery } from './api';
import { usePostContractorRecovery } from './useContractorRecoveries';
import {
  postRecoverySchema,
  type PostRecoveryFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  recovery: PublicContractorRecovery | null;
};

export function PostRecoveryDialog({ open, onClose, recovery }: Props) {
  const post = usePostContractorRecovery();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<PostRecoveryFormValues>({
    resolver: zodResolver(postRecoverySchema),
    defaultValues: { billId: recovery?.billId ?? '' },
  });

  const onSubmit = async (values: PostRecoveryFormValues) => {
    if (!recovery) return;
    try {
      await post.mutateAsync({
        id: recovery.id,
        billId: values.billId?.trim() || null,
      });
      success('Recovery posted');
      reset();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Post recovery</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {recovery
            ? `${formatInr(recovery.amount)} · attach to bill (optional)`
            : ''}
        </Typography>
        <FormTextField
          name="billId"
          control={control}
          label="Bill id (optional)"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={post.isPending}
        >
          Post
        </Button>
      </DialogActions>
    </Dialog>
  );
}
