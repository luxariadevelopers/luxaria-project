import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { searchContractors } from '@/api/searchLists';
import { DateInput } from '@/components/forms/DateInput';
import type { PublicContractorTender } from './api';
import {
  formValuesToInviteInput,
  tenderInviteFormSchema,
  type TenderInviteFormValues,
} from './validation';

type ContractorOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  tender: PublicContractorTender | null;
  canViewContractors: boolean;
  loading?: boolean;
  onConfirm: (input: ReturnType<typeof formValuesToInviteInput>) => void;
};

export function TenderInviteDialog({
  open,
  onClose,
  tender,
  canViewContractors,
  loading,
  onConfirm,
}: Props) {
  const [options, setOptions] = useState<ContractorOption[]>([]);
  const [searching, setSearching] = useState(false);

  const { control, handleSubmit, reset } = useForm<TenderInviteFormValues>({
    resolver: zodResolver(tenderInviteFormSchema),
    defaultValues: {
      contractorIds: [],
      bidDeadline: '',
    },
  });

  useEffect(() => {
    if (!open || !tender) return;
    reset({
      contractorIds: [...tender.invitedContractorIds],
      bidDeadline: tender.bidDeadline
        ? tender.bidDeadline.slice(0, 10)
        : '',
    });
  }, [open, tender, reset]);

  const load = async (input: string) => {
    if (!canViewContractors) {
      setOptions([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await searchContractors({ search: input, limit: 30 });
      setOptions(
        rows.map((row) => ({
          value: row.id,
          label: [row.contractorCode, row.legalName]
            .filter(Boolean)
            .join(' — '),
        })),
      );
    } finally {
      setSearching(false);
    }
  };

  const submit = handleSubmit((values) => {
    onConfirm(formValuesToInviteInput(values));
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Invite contractors{tender ? ` — ${tender.tenderNumber}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="tender-invite-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST /contractor-tenders/:id/invite` (`tender.manage`). Draft
            or invited → invited.
          </Typography>
          {!canViewContractors ? (
            <Typography variant="body2" color="warning.main">
              Missing `contractor.view` — contractor search unavailable.
            </Typography>
          ) : null}
          <Controller
            name="contractorIds"
            control={control}
            render={({ field, fieldState }) => {
              const known = new Map(options.map((o) => [o.value, o]));
              for (const id of field.value) {
                if (!known.has(id)) {
                  known.set(id, { value: id, label: id });
                }
              }
              const value = field.value
                .map((id) => known.get(id))
                .filter(Boolean) as ContractorOption[];

              return (
                <Autocomplete
                  multiple
                  options={options}
                  value={value}
                  loading={searching}
                  disabled={!canViewContractors}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(a, b) => a.value === b.value}
                  onOpen={() => void load('')}
                  onInputChange={(_, input, reason) => {
                    if (reason === 'input') void load(input);
                  }}
                  onChange={(_, next) => {
                    field.onChange(next.map((o) => o.value));
                    setOptions((prev) => {
                      const map = new Map(prev.map((o) => [o.value, o]));
                      for (const o of next) map.set(o.value, o);
                      return [...map.values()];
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Contractors"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />
              );
            }}
          />
          <DateInput
            name="bidDeadline"
            control={control}
            label="Bid deadline (optional override)"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="tender-invite-form"
          variant="contained"
          disabled={loading || !canViewContractors}
        >
          Send invites
        </Button>
      </DialogActions>
    </Dialog>
  );
}
