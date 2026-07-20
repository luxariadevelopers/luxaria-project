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
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { contributionTypeLabel } from './labels';
import { ContributionType, type PublicCommitment } from './types';
import { useAmendCommitment } from './useCommitments';
import {
  commitmentAmendSchema,
  type CommitmentAmendFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  commitment: PublicCommitment | null;
};

const TYPE_OPTIONS = Object.values(ContributionType).map((value) => ({
  value,
  label: contributionTypeLabel(value),
}));

export function AmendCommitmentDialog({
  open,
  onClose,
  projectId,
  commitment,
}: Props) {
  const amend = useAmendCommitment(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<CommitmentAmendFormValues>({
    resolver: zodResolver(commitmentAmendSchema),
    defaultValues: {
      commitmentAmount: 0,
      dueDate: '',
      contributionType: ContributionType.Capital,
      remarks: '',
      receivedAmount: 0,
    },
  });

  useEffect(() => {
    if (commitment && open) {
      reset({
        commitmentAmount: commitment.commitmentAmount,
        dueDate: commitment.dueDate
          ? commitment.dueDate.slice(0, 10)
          : '',
        contributionType: commitment.contributionType,
        remarks: '',
        receivedAmount: commitment.receivedAmount,
      });
    }
  }, [commitment, open, reset]);

  const onSubmit = async (values: CommitmentAmendFormValues) => {
    if (!commitment) return;
    try {
      await amend.mutateAsync({
        id: commitment.id,
        input: {
          commitmentAmount: values.commitmentAmount,
          dueDate: values.dueDate || null,
          contributionType: values.contributionType,
          remarks: values.remarks,
        },
      });
      success('Amendment draft created (new version)');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Amend {commitment?.commitmentNumber} (v{commitment?.version})
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Creates a new draft version — approved rows are never edited in
            place. Amount cannot be below received{' '}
            {formatInr(commitment?.receivedAmount ?? 0)}. Requires
            contribution_commitment.amend.
          </Typography>
          <FormTextField
            name="commitmentAmount"
            control={control}
            label="New commitment amount"
            type="number"
            required
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="dueDate"
            control={control}
            label="Due date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }}
          />
          <FormSelect
            name="contributionType"
            control={control}
            label="Contribution type"
            options={TYPE_OPTIONS}
            sx={{ mb: 2 }}
          />
          <FormTextField
            name="remarks"
            control={control}
            label="Amendment remarks"
            required
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={amend.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={amend.isPending}
          >
            {amend.isPending ? 'Saving…' : 'Create amendment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
