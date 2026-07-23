import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { contributionTypeLabel } from './labels';
import { ContributionType } from './types';
import { useCreateCommitment } from './useCommitments';
import { formDrawerPaperSx } from '@/components/forms';
import {
  commitmentCreateSchema,
  type CommitmentCreateFormValues,
} from './validation';

type ParticipantOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  participants: readonly ParticipantOption[];
};

const TYPE_OPTIONS = Object.values(ContributionType).map((value) => ({
  value,
  label: contributionTypeLabel(value),
}));

export function CreateCommitmentDrawer({
  open,
  onClose,
  projectId,
  participants,
}: Props) {
  const create = useCreateCommitment(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<CommitmentCreateFormValues>({
    resolver: zodResolver(commitmentCreateSchema),
    defaultValues: {
      participantId: '',
      commitmentAmount: 0,
      commitmentDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      contributionType: ContributionType.Capital,
      agreementReference: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: CommitmentCreateFormValues) => {
    try {
      await create.mutateAsync({
        participantId: values.participantId,
        commitmentAmount: values.commitmentAmount,
        commitmentDate: values.commitmentDate,
        dueDate: values.dueDate,
        contributionType: values.contributionType,
        agreementReference: values.agreementReference || null,
        remarks: values.remarks || null,
      });
      success('Commitment draft created');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const participantOptions = participants.map((p) => ({
    value: p.id,
    label: p.label,
  }));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(440) },
      }}
    >
      <Box sx={{ p: 2.5 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Typography variant="h6">New commitment</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires contribution_commitment.create. For directors: first
            investment must be <strong>capital</strong>; after that capital is
            received, further money into a project must be a{' '}
            <strong>loan</strong> (director loan to that project).
          </Typography>

          <FormSelect
            name="participantId"
            control={control}
            label="Participant"
            options={participantOptions}
          />

          <FormSelect
            name="contributionType"
            control={control}
            label="Contribution type"
            options={TYPE_OPTIONS}
          />

          <FormTextField
            name="commitmentAmount"
            control={control}
            label="Commitment amount"
            type="number"
            required
          />
          <FormTextField
            name="commitmentDate"
            control={control}
            label="Commitment date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormTextField
            name="dueDate"
            control={control}
            label="Due date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormTextField
            name="agreementReference"
            control={control}
            label="Agreement reference"
          />
          <FormTextField
            name="remarks"
            control={control}
            label="Remarks"
            multiline
            minRows={2}
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'flex-end' }}
          >
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending || participants.length === 0}
            >
              {create.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
