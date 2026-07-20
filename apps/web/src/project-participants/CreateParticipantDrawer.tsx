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
import {
  instrumentTypeLabel,
  participantTypeLabel,
} from './labels';
import { InstrumentType, ParticipantType } from './types';
import { useCreateParticipant } from './useProjectParticipants';
import {
  emptyToNull,
  participantCreateSchema,
  type ParticipantCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
};

const TYPE_OPTIONS = Object.values(ParticipantType).map((value) => ({
  value,
  label: participantTypeLabel(value),
}));

const INSTRUMENT_OPTIONS = Object.values(InstrumentType).map((value) => ({
  value,
  label: instrumentTypeLabel(value),
}));

const LOAN_INSTRUMENTS = new Set<string>([
  InstrumentType.DirectorLoan,
  InstrumentType.UnsecuredLoan,
]);

export function CreateParticipantDrawer({
  open,
  projectId,
  onClose,
  onCreated,
}: Props) {
  const create = useCreateParticipant(projectId);
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<ParticipantCreateFormValues>({
    resolver: zodResolver(
      participantCreateSchema,
    ) as Resolver<ParticipantCreateFormValues>,
    defaultValues: {
      participantType: ParticipantType.Director,
      participantId: '',
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
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: ParticipantCreateFormValues) => {
    try {
      await create.mutateAsync({
        participantType: values.participantType,
        participantId: values.participantId,
        commitmentAmount: values.commitmentAmount,
        expectedContributionDate: emptyToNull(values.expectedContributionDate),
        actualContributionAmount: values.actualContributionAmount,
        approvedProfitSharePercentage: values.approvedProfitSharePercentage,
        lossSharePercentage: values.lossSharePercentage,
        interestRate: values.interestRate,
        instrumentType: values.instrumentType,
        effectiveFrom: emptyToNull(values.effectiveFrom) ?? undefined,
        notes: emptyToNull(values.notes),
      });
      success('Participant draft created — submit for approval when ready');
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
      <Box sx={{ p: 3 }} data-testid="create-participant-drawer">
        <Typography variant="h6" sx={{ mb: 1 }}>
          New participant
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Creates a draft funding participant. Project profit share is
          independent of company shareholding. Loan instruments require an
          interest rate.
        </Typography>

        <Stack
          component="form"
          spacing={2}
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
        >
          <FormSelect
            name="participantType"
            control={control}
            label="Participant type"
            options={TYPE_OPTIONS}
          />
          <FormTextField
            name="participantId"
            control={control}
            label="Participant id"
            helperText="Director / Investor / Company Mongo id"
          />
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
            name="expectedContributionDate"
            control={control}
            label="Expected contribution (YYYY-MM-DD)"
          />
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
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              Create draft
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
