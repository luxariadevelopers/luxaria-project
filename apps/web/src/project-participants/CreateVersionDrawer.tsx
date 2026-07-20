import { useEffect } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { instrumentTypeLabel } from './labels';
import { InstrumentType, type PublicProjectParticipant } from './types';
import { useCreateParticipantVersion } from './useProjectParticipants';
import {
  emptyToNull,
  participantVersionSchema,
  type ParticipantVersionFormValues,
} from './validation';

type Props = {
  open: boolean;
  projectId: string;
  participant: PublicProjectParticipant | null;
  onClose: () => void;
  onCreated: () => void;
};

const INSTRUMENT_OPTIONS = Object.values(InstrumentType).map((value) => ({
  value,
  label: instrumentTypeLabel(value),
}));

const LOAN_INSTRUMENTS = new Set<string>([
  InstrumentType.DirectorLoan,
  InstrumentType.UnsecuredLoan,
]);

export function CreateVersionDrawer({
  open,
  projectId,
  participant,
  onClose,
  onCreated,
}: Props) {
  const createVersion = useCreateParticipantVersion(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } =
    useForm<ParticipantVersionFormValues>({
      resolver: zodResolver(
        participantVersionSchema,
      ) as Resolver<ParticipantVersionFormValues>,
      defaultValues: {
        commitmentAmount: 0,
        expectedContributionDate: '',
        actualContributionAmount: 0,
        approvedProfitSharePercentage: 0,
        lossSharePercentage: 0,
        interestRate: null,
        instrumentType: InstrumentType.ProjectInvestment,
        effectiveFrom: '',
        notes: '',
      },
    });

  const instrumentType = useWatch({ control, name: 'instrumentType' });
  const needsInterest = LOAN_INSTRUMENTS.has(instrumentType);

  useEffect(() => {
    if (open && participant) {
      reset({
        commitmentAmount: participant.commitmentAmount,
        expectedContributionDate:
          participant.expectedContributionDate ?? '',
        actualContributionAmount: participant.actualContributionAmount,
        approvedProfitSharePercentage:
          participant.approvedProfitSharePercentage,
        lossSharePercentage: participant.lossSharePercentage,
        interestRate: participant.interestRate,
        instrumentType: participant.instrumentType,
        effectiveFrom: '',
        notes: '',
      });
    }
    if (!open) {
      reset();
    }
  }, [open, participant, reset]);

  const onSubmit = async (values: ParticipantVersionFormValues) => {
    if (!participant) return;
    try {
      await createVersion.mutateAsync({
        recordId: participant.id,
        input: {
          commitmentAmount: values.commitmentAmount,
          expectedContributionDate: emptyToNull(
            values.expectedContributionDate,
          ),
          actualContributionAmount: values.actualContributionAmount,
          approvedProfitSharePercentage: values.approvedProfitSharePercentage,
          lossSharePercentage: values.lossSharePercentage,
          interestRate: values.interestRate,
          instrumentType: values.instrumentType,
          effectiveFrom: emptyToNull(values.effectiveFrom) ?? undefined,
          notes: emptyToNull(values.notes),
        },
      });
      success('New participant version created as draft');
      onCreated();
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 440 } } },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="create-version-drawer">
        <Typography variant="h6" sx={{ mb: 1 }}>
          New version
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Profit-share changes create a new draft version. The prior approved
          row stays until the new version is approved.
          {participant
            ? ` Current: ${participant.participantLabel ?? participant.participantId} (v${participant.version}).`
            : ''}
        </Typography>

        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <FormSelect
            name="instrumentType"
            control={control}
            label="Instrument"
            options={INSTRUMENT_OPTIONS}
          />
          <FormTextField
            name="commitmentAmount"
            control={control}
            label="Commitment amount"
            type="number"
          />
          <FormTextField
            name="approvedProfitSharePercentage"
            control={control}
            label="Profit share %"
            type="number"
          />
          <FormTextField
            name="lossSharePercentage"
            control={control}
            label="Loss share %"
            type="number"
          />
          {needsInterest ? (
            <FormTextField
              name="interestRate"
              control={control}
              label="Interest rate %"
              type="number"
            />
          ) : null}
          <FormTextField
            name="effectiveFrom"
            control={control}
            label="Effective from (YYYY-MM-DD)"
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />

          <Divider />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={createVersion.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createVersion.isPending || !participant}
            >
              Create version
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
