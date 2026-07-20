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
import type { PublicContractorAgreement } from './types';
import { useRejectContractorAgreement } from './useContractorAgreements';
import {
  rejectAgreementSchema,
  type RejectAgreementFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  agreement: PublicContractorAgreement | null;
};

export function RejectAgreementDialog({ open, onClose, agreement }: Props) {
  const reject = useRejectContractorAgreement();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<RejectAgreementFormValues>({
    resolver: zodResolver(rejectAgreementSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = async (values: RejectAgreementFormValues) => {
    if (!agreement) return;
    try {
      await reject.mutateAsync({ id: agreement.id, reason: values.reason });
      success('Agreement rejected');
      reset();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject agreement</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {agreement
            ? `${agreement.agreementNumber} v${agreement.version}`
            : ''}
        </Typography>
        <FormTextField
          name="reason"
          control={control}
          label="Rejection reason"
          multiline
          minRows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={reject.isPending}
        >
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  );
}
