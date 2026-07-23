import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { formDrawerPaperSx } from '@/components/forms';
import {
  Alert,
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { AsyncSelect } from '@/components/forms/AsyncSelect';
import { DateInput } from '@/components/forms/DateInput';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { fetchBoqItemsForMeasurement } from '@/work-measurements/api';
import {
  useCreateMeasurementBook,
  useSubmitMeasurementBook,
} from './useMeasurementBook';
import {
  defaultMeasurementBookFormValues,
  formValuesToCreateInput,
  measurementBookFormSchema,
  type MeasurementBookFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canCreate: boolean;
  canViewBoq: boolean;
  canViewContractors: boolean;
};

export function MeasurementBookFormDrawer({
  open,
  onClose,
  projectId,
  canCreate,
  canViewBoq,
  canViewContractors,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateMeasurementBook();
  const submit = useSubmitMeasurementBook();

  const { control, handleSubmit, reset } = useForm<MeasurementBookFormValues>({
    resolver: zodResolver(measurementBookFormSchema),
    defaultValues: defaultMeasurementBookFormValues(),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultMeasurementBookFormValues());
  }, [open, reset]);

  const loadContractors = useMemo(
    () => async (input: string) => {
      if (!canViewContractors) return [];
      const rows = await searchContractors({ search: input, limit: 20 });
      return rows.map((row) => ({
        value: row.id,
        label: [row.contractorCode, row.legalName].filter(Boolean).join(' — '),
      }));
    },
    [canViewContractors],
  );

  const loadBoq = useMemo(
    () => async (input: string) => {
      if (!canViewBoq) return [];
      const rows = await fetchBoqItemsForMeasurement({
        projectId,
        search: input || undefined,
        limit: 40,
      });
      return rows.map((row) => ({
        value: row.id,
        label: [row.boqCode, row.description].filter(Boolean).join(' — '),
      }));
    },
    [canViewBoq, projectId],
  );

  const onSubmit = async (values: MeasurementBookFormValues) => {
    if (!canCreate) return;
    try {
      const created = await create.mutateAsync(
        formValuesToCreateInput(values, projectId),
      );
      if (values.submitOnSave) {
        await submit.mutateAsync(created.id);
        success('Measurement book entry created and submitted');
      } else {
        success('Measurement book draft created');
      }
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
        paper: { sx: formDrawerPaperSx({ sm: 520, md: 640 }) },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%', overflow: 'auto' }}
        data-testid="measurement-book-form-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          New measurement book entry
        </Typography>

        <Stack spacing={3}>
          {!canViewContractors ? (
            <Alert severity="warning">
              Missing `contractor.view` — contractor picker unavailable.
            </Alert>
          ) : null}
          {!canViewBoq ? (
            <Alert severity="warning">
              Missing `boq.view` — BOQ picker unavailable.
            </Alert>
          ) : null}

          <FormSection title="Parties & BOQ">
            <AsyncSelect
              name="contractorId"
              control={control}
              label="Contractor"
              loadOptions={loadContractors}
              disabled={!canCreate || !canViewContractors}
              required
            />
            <AsyncSelect
              name="boqItemId"
              control={control}
              label="BOQ item"
              loadOptions={loadBoq}
              disabled={!canCreate || !canViewBoq}
              required
              helperText="Active BOQ items for this project"
            />
          </FormSection>

          <FormSection title="Period">
            <DateInput
              name="periodFrom"
              control={control}
              label="Period from"
              required
              disabled={!canCreate}
            />
            <DateInput
              name="periodTo"
              control={control}
              label="Period to"
              required
              disabled={!canCreate}
            />
            <DateInput
              name="measurementDate"
              control={control}
              label="Measurement date"
              required
              disabled={!canCreate}
            />
          </FormSection>

          <FormSection title="Dimensions / quantity">
            <FormTextField
              name="numberOfUnits"
              control={control}
              label="Number of units"
              type="number"
              disabled={!canCreate}
            />
            <FormTextField
              name="length"
              control={control}
              label="Length (L)"
              type="number"
              disabled={!canCreate}
            />
            <FormTextField
              name="breadth"
              control={control}
              label="Breadth (B)"
              type="number"
              disabled={!canCreate}
            />
            <FormTextField
              name="height"
              control={control}
              label="Height (H)"
              type="number"
              disabled={!canCreate}
            />
            <FormTextField
              name="quantity"
              control={control}
              label="Quantity override"
              type="number"
              helperText="Optional when L×B×H×nos is provided"
              disabled={!canCreate}
            />
            <FormTextField
              name="locationLabel"
              control={control}
              label="Location label"
              disabled={!canCreate}
            />
          </FormSection>

          <FormSection title="Notes">
            <FormTextField
              name="workDescription"
              control={control}
              label="Work description"
              multiline
              minRows={2}
              disabled={!canCreate}
            />
            <FormTextField
              name="sheetReference"
              control={control}
              label="Sheet reference"
              disabled={!canCreate}
            />
            <FormTextField
              name="notes"
              control={control}
              label="Notes"
              multiline
              minRows={2}
              disabled={!canCreate}
            />
            <FormCheckbox
              name="submitOnSave"
              control={control}
              label="Submit after create"
            />
          </FormSection>

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!canCreate || create.isPending || submit.isPending}
            >
              Create entry
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
