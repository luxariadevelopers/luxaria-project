import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { EmptyState, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { workMeasurementUnitLabel } from './labels';
import type { PublicWorkMeasurement } from './types';
import {
  useBoqItemsForMeasurement,
  useContractorsForMeasurement,
  useCreateWorkMeasurement,
  usePriorQuantityPreview,
  useUpdateWorkMeasurement,
} from './useWorkMeasurements';
import {
  measurementFormSchema,
  parsePhotoDocumentIds,
  roundQty,
  validateCumulativeWithinBoq,
  type MeasurementFormValues,
} from './validation';
import { isWorkMeasurementEditable } from './workflowActions';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  measurement?: PublicWorkMeasurement | null;
  canViewBoq: boolean;
  canViewContractors: boolean;
  onSaved?: (row: PublicWorkMeasurement) => void;
};

export function MeasurementForm({
  open,
  onClose,
  projectId,
  measurement,
  canViewBoq,
  canViewContractors,
  onSaved,
}: Props) {
  const isEdit = Boolean(measurement?.id);
  const editable = !measurement || isWorkMeasurementEditable(measurement);
  const create = useCreateWorkMeasurement();
  const update = useUpdateWorkMeasurement();
  const { success, error: notifyError } = useNotify();
  const [cumulativeError, setCumulativeError] = useState<string | null>(null);
  const [contractorSearch, setContractorSearch] = useState('');
  const [boqSearch, setBoqSearch] = useState('');

  const contractorsQuery = useContractorsForMeasurement(
    contractorSearch,
    open && canViewContractors,
  );
  const boqQuery = useBoqItemsForMeasurement(
    projectId,
    boqSearch,
    open && canViewBoq,
  );

  const { control, handleSubmit, reset, setError } =
    useForm<MeasurementFormValues>({
      resolver: zodResolver(measurementFormSchema),
      defaultValues: {
        projectId,
        contractorId: '',
        boqItemId: '',
        location: '',
        measurementDate: new Date().toISOString().slice(0, 10),
        currentQuantity: 0,
        measuredBy: '',
        drawingReference: '',
        notes: '',
        photoDocumentIdsRaw: '',
        submitOnSave: false,
      },
    });

  const watched = useWatch({ control });
  const priorQuery = usePriorQuantityPreview({
    projectId,
    contractorId: watched.contractorId || null,
    boqItemId: watched.boqItemId || null,
    excludeId: measurement?.id,
    enabled: open,
  });

  const selectedBoq = useMemo(
    () => boqQuery.data?.find((item) => item.id === watched.boqItemId),
    [boqQuery.data, watched.boqItemId],
  );

  const previousQuantity = isEdit
    ? (measurement?.previousQuantity ?? priorQuery.previousQuantity)
    : priorQuery.previousQuantity;

  const boqPlannedQuantity =
    measurement?.boqPlannedQuantity ?? selectedBoq?.plannedQuantity ?? 0;

  const cumulativePreview = roundQty(
    previousQuantity + Number(watched.currentQuantity ?? 0),
  );

  useEffect(() => {
    if (!open) return;
    if (measurement) {
      reset({
        projectId: measurement.projectId,
        contractorId: measurement.contractorId,
        boqItemId: measurement.boqItemId,
        location: measurement.location,
        measurementDate: measurement.measurementDate.slice(0, 10),
        currentQuantity: measurement.currentQuantity,
        measuredBy: measurement.measuredBy,
        drawingReference: measurement.drawingReference ?? '',
        notes: measurement.notes ?? '',
        photoDocumentIdsRaw: (measurement.photos ?? []).join(', '),
        submitOnSave: false,
      });
    } else {
      reset({
        projectId,
        contractorId: '',
        boqItemId: '',
        location: '',
        measurementDate: new Date().toISOString().slice(0, 10),
        currentQuantity: 0,
        measuredBy: '',
        drawingReference: '',
        notes: '',
        photoDocumentIdsRaw: '',
        submitOnSave: false,
      });
    }
    setCumulativeError(null);
    setContractorSearch('');
    setBoqSearch('');
  }, [open, measurement, projectId, reset]);

  useEffect(() => {
    if (!watched.boqItemId || !watched.contractorId) {
      setCumulativeError(null);
      return;
    }
    const result = validateCumulativeWithinBoq({
      previousQuantity,
      currentQuantity: Number(watched.currentQuantity ?? 0),
      boqPlannedQuantity,
    });
    setCumulativeError(result.ok ? null : result.message);
  }, [
    watched.boqItemId,
    watched.contractorId,
    watched.currentQuantity,
    previousQuantity,
    boqPlannedQuantity,
  ]);

  const contractorOptions = useMemo(
    () =>
      (contractorsQuery.data ?? []).map((row) => ({
        value: row.id,
        label: `${row.contractorCode} — ${row.legalName}`,
      })),
    [contractorsQuery.data],
  );

  const boqOptions = useMemo(
    () =>
      (boqQuery.data ?? []).map((row) => ({
        value: row.id,
        label: `${row.boqCode} — ${row.description}`,
      })),
    [boqQuery.data],
  );

  const onSubmit = async (values: MeasurementFormValues) => {
    const cumulativeCheck = validateCumulativeWithinBoq({
      previousQuantity,
      currentQuantity: values.currentQuantity,
      boqPlannedQuantity,
    });
    if (!cumulativeCheck.ok) {
      setError('currentQuantity', { message: cumulativeCheck.message });
      setCumulativeError(cumulativeCheck.message);
      return;
    }

    const photoDocumentIds = parsePhotoDocumentIds(
      values.photoDocumentIdsRaw ?? '',
    );
    const payload = {
      projectId: values.projectId,
      contractorId: values.contractorId,
      boqItemId: values.boqItemId,
      location: values.location.trim(),
      measurementDate: values.measurementDate,
      currentQuantity: values.currentQuantity,
      measuredBy: values.measuredBy?.trim() || undefined,
      drawingReference: values.drawingReference?.trim() || null,
      notes: values.notes?.trim() || null,
      photoDocumentIds: photoDocumentIds.length ? photoDocumentIds : undefined,
      submit: values.submitOnSave || undefined,
    };

    try {
      const saved = isEdit
        ? await update.mutateAsync({ id: measurement!.id, input: payload })
        : await create.mutateAsync(payload);
      success(
        isEdit
          ? 'Work measurement updated'
          : values.submitOnSave
            ? 'Work measurement created and submitted'
            : 'Work measurement draft created',
      );
      onClose();
      onSaved?.(saved);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const saving = create.isPending || update.isPending;
  const readOnly = isEdit && !editable;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 520 } } },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        data-testid="measurement-form"
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            {isEdit ? 'Edit work measurement' : 'New work measurement'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record site quantities against active BOQ items. Cumulative cannot
            exceed BOQ planned quantity without an approved variation.
          </Typography>

          {measurement ? (
            <Alert severity="info" variant="outlined">
              {measurement.measurementNumber} · Previous{' '}
              {measurement.previousQuantity}{' '}
              {workMeasurementUnitLabel(measurement.unit)} · Unit{' '}
              {workMeasurementUnitLabel(measurement.unit)}
            </Alert>
          ) : null}

          {readOnly ? (
            <Alert severity="warning">
              Only draft or rejected measurements can be edited.
            </Alert>
          ) : null}

          <FormTextField
            name="measurementDate"
            control={control}
            label="Measurement date"
            type="date"
            required
            disabled={readOnly}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          {canViewContractors ? (
            contractorsQuery.error ? (
              <RetryPanel
                error={contractorsQuery.error}
                onRetry={() => void contractorsQuery.refetch()}
                forceRetry
              />
            ) : (
              <>
                <TextField
                  size="small"
                  label="Search contractors"
                  value={contractorSearch}
                  onChange={(event) => setContractorSearch(event.target.value)}
                  disabled={readOnly}
                />
                <FormSelect
                  name="contractorId"
                  control={control}
                  label="Contractor"
                  options={contractorOptions}
                  required
                  disabled={readOnly}
                />
              </>
            )
          ) : (
            <FormTextField
              name="contractorId"
              control={control}
              label="Contractor id"
              required
              disabled={readOnly}
              helperText="Need contractor.view to browse contractors"
            />
          )}

          {canViewBoq ? (
            boqQuery.error ? (
              <RetryPanel
                error={boqQuery.error}
                onRetry={() => void boqQuery.refetch()}
                forceRetry
              />
            ) : (
              <>
                <TextField
                  size="small"
                  label="Search BOQ items"
                  value={boqSearch}
                  onChange={(event) => setBoqSearch(event.target.value)}
                  disabled={readOnly}
                />
                <FormSelect
                  name="boqItemId"
                  control={control}
                  label="BOQ item"
                  options={boqOptions}
                  required
                  disabled={readOnly}
                />
              </>
            )
          ) : (
            <FormTextField
              name="boqItemId"
              control={control}
              label="BOQ item id"
              required
              disabled={readOnly}
              helperText="Need boq.view to browse BOQ items"
            />
          )}

          {!canViewBoq ? (
            <EmptyState
              title="BOQ picker unavailable"
              description="Enter a BOQ item ObjectId manually or request boq.view."
            />
          ) : null}

          <FormTextField
            name="location"
            control={control}
            label="Site location"
            required
            disabled={readOnly}
          />

          <FormTextField
            name="currentQuantity"
            control={control}
            label="Current quantity (this period)"
            type="number"
            required
            disabled={readOnly}
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            helperText={
              selectedBoq || measurement
                ? `Previous ${previousQuantity}; cumulative preview ${cumulativePreview} / BOQ ${boqPlannedQuantity}${
                    selectedBoq || measurement
                      ? ` ${workMeasurementUnitLabel(
                          selectedBoq?.unit ?? measurement!.unit,
                        )}`
                      : ''
                  }`
                : 'Select contractor and BOQ item to preview cumulative'
            }
          />

          {cumulativeError ? (
            <Alert severity="error">{cumulativeError}</Alert>
          ) : null}

          <FormTextField
            name="drawingReference"
            control={control}
            label="Drawing reference"
            disabled={readOnly}
          />

          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
            disabled={readOnly}
          />

          <FormTextField
            name="photoDocumentIdsRaw"
            control={control}
            label="Photo document ids"
            multiline
            minRows={2}
            disabled={readOnly}
            helperText="Comma- or space-separated document ObjectIds (from Documents module)"
          />

          {!isEdit ? (
            <FormCheckbox
              name="submitOnSave"
              control={control}
              label="Submit for engineer verification after save"
            />
          ) : null}

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            {!readOnly ? (
              <Button
                type="submit"
                variant="contained"
                disabled={saving || Boolean(cumulativeError)}
              >
                {isEdit ? 'Save changes' : 'Save draft'}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
