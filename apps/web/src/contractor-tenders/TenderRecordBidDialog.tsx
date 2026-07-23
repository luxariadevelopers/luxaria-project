import { useEffect } from 'react';
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
import { BoqUnit } from '@/boq/types';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import type { PublicContractorTender, RecordBidInput } from './api';
import {
  defaultTenderRecordBidFormValues,
  formValuesToRecordBidInput,
  tenderRecordBidFormSchema,
  type TenderRecordBidFormValues,
} from './tenderRecordBidForm';

type Props = {
  open: boolean;
  onClose: () => void;
  tender: PublicContractorTender | null;
  loading?: boolean;
  onConfirm: (input: RecordBidInput) => void;
};

const unitOptions = Object.values(BoqUnit).map((value) => ({
  value,
  label: value.replaceAll('_', ' '),
}));

/**
 * Nest `POST /contractor-tenders/:id/bids` — record technical/commercial bid
 * while invited or bidding (`tender.manage`).
 */
export function TenderRecordBidDialog({
  open,
  onClose,
  tender,
  loading,
  onConfirm,
}: Props) {
  const invited = tender?.invitedContractorIds ?? [];
  const { control, handleSubmit, reset, watch } =
    useForm<TenderRecordBidFormValues>({
      resolver: zodResolver(tenderRecordBidFormSchema),
      defaultValues: defaultTenderRecordBidFormValues(),
    });

  const includeTechnical = watch('includeTechnical');
  const includeCommercial = watch('includeCommercial');

  useEffect(() => {
    if (!open || !tender) return;
    reset(
      defaultTenderRecordBidFormValues(tender.invitedContractorIds[0] ?? ''),
    );
  }, [open, tender, reset]);

  const submit = handleSubmit((values) => {
    onConfirm(formValuesToRecordBidInput(values));
  });

  const contractorOptions = invited.map((id) => ({
    value: id,
    label: id,
  }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Record bid{tender ? ` — ${tender.tenderNumber}` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="tender-record-bid-form"
          spacing={2}
          sx={{ mt: 1 }}
          onSubmit={submit}
        >
          <Typography variant="body2" color="text.secondary">
            Nest `POST /contractor-tenders/:id/bids` (`tender.manage`). Invited /
            bidding → bidding. Contractor must already be invited.
          </Typography>
          {invited.length === 0 ? (
            <Typography variant="body2" color="warning.main">
              Invite contractors before recording a bid.
            </Typography>
          ) : (
            <FormSelect
              name="contractorId"
              control={control}
              label="Invited contractor"
              options={contractorOptions}
            />
          )}
          <FormCheckbox
            name="includeTechnical"
            control={control}
            label="Include technical bid"
          />
          {includeTechnical ? (
            <Stack spacing={2}>
              <FormTextField
                name="technicalScore"
                control={control}
                label="Technical score (0–100)"
                type="number"
              />
              <FormTextField
                name="complianceNotes"
                control={control}
                label="Compliance notes"
                multiline
                minRows={2}
              />
            </Stack>
          ) : null}
          <FormCheckbox
            name="includeCommercial"
            control={control}
            label="Include commercial bid (single line)"
          />
          {includeCommercial ? (
            <Stack spacing={2}>
              <FormTextField
                name="description"
                control={control}
                label="Line description"
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormSelect
                  name="unit"
                  control={control}
                  label="Unit"
                  options={unitOptions}
                />
                <FormTextField
                  name="quantity"
                  control={control}
                  label="Quantity"
                  type="number"
                />
                <FormTextField
                  name="rate"
                  control={control}
                  label="Rate"
                  type="number"
                />
              </Stack>
              <FormTextField
                name="commercialNotes"
                control={control}
                label="Commercial notes"
                multiline
                minRows={2}
              />
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="tender-record-bid-form"
          variant="contained"
          disabled={loading || invited.length === 0}
        >
          Record bid
        </Button>
      </DialogActions>
    </Dialog>
  );
}
