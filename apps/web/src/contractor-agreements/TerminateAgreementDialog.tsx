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
import { useTerminateContractorAgreement } from './useContractorAgreements';
import {
  terminateAgreementSchema,
  type TerminateAgreementFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  agreement: PublicContractorAgreement | null;
};

export function TerminateAgreementDialog({ open, onClose, agreement }: Props) {
  const terminate = useTerminateContractorAgreement();
  const { success, error: notifyError } = useNotify();
  const { control, handleSubmit, reset } = useForm<TerminateAgreementFormValues>(
    {
      resolver: zodResolver(terminateAgreementSchema),
      defaultValues: { reason: '' },
    },
  );

  const onSubmit = async (values: TerminateAgreementFormValues) => {
    if (!agreement) return;
    try {
      await terminate.mutateAsync({
        id: agreement.id,
        reason: values.reason,
      });
      success('Agreement terminated');
      reset();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Terminate agreement</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {agreement
            ? `${agreement.agreementNumber} v${agreement.version}`
            : ''}
        </Typography>
        <FormTextField
          name="reason"
          control={control}
          label="Termination reason"
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
          disabled={terminate.isPending}
        >
          Terminate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
