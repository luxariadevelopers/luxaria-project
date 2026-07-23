import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, RetryPanel } from '@/components/errors';
import { grnStatusLabel } from './labels';
import type { InspectableGrnOption } from './types';
import { useCreateQualityInspection } from './useQualityInspections';
import { formDrawerPaperSx } from '@/components/forms';
import {
  inspectionCreateSchema,
  type InspectionCreateFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  grns: readonly InspectableGrnOption[];
  grnsLoading?: boolean;
  grnsError?: unknown;
  onRetryGrns?: () => void;
  onCreated?: (id: string) => void;
};

/**
 * Create draft inspection for a GRN (`POST /quality-inspections`).
 * Nest copies GRN lines; result is recorded later via complete.
 */
export function InspectionForm({
  open,
  onClose,
  grns,
  grnsLoading,
  grnsError,
  onRetryGrns,
  onCreated,
}: Props) {
  const create = useCreateQualityInspection();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<InspectionCreateFormValues>({
    resolver: zodResolver(inspectionCreateSchema),
    defaultValues: {
      grnId: '',
      inspectionDate: new Date().toISOString().slice(0, 10),
      remarks: '',
    },
  });

  useEffect(() => {
    if (!open) {
      reset({
        grnId: '',
        inspectionDate: new Date().toISOString().slice(0, 10),
        remarks: '',
      });
    }
  }, [open, reset]);

  const onSubmit = async (values: InspectionCreateFormValues) => {
    try {
      const created = await create.mutateAsync({
        grnId: values.grnId,
        inspectionDate: values.inspectionDate,
        remarks: values.remarks?.trim() || null,
      });
      success('Quality inspection draft created');
      onClose();
      onCreated?.(created.id);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const grnOptions = grns.map((g) => ({
    value: g.id,
    label: `${g.grnNumber} · ${grnStatusLabel(g.status)}`,
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
          <Typography variant="h6">New quality inspection</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires quality.inspect. GRN must be submitted or in quality check.
            Nest starts quality check when creating from a submitted GRN.
          </Typography>

          {grnsError ? (
            <RetryPanel error={grnsError} onRetry={onRetryGrns} forceRetry />
          ) : null}

          {!grnsLoading && !grnsError && grns.length === 0 ? (
            <EmptyState
              title="No inspectable GRNs"
              description="Submit a goods receipt (or move one to quality check) before creating an inspection."
            />
          ) : (
            <FormSelect
              name="grnId"
              control={control}
              label="Goods receipt (GRN)"
              options={grnOptions}
            />
          )}

          <FormTextField
            name="inspectionDate"
            control={control}
            label="Inspection date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormTextField
            name="remarks"
            control={control}
            label="Remarks"
            multiline
            minRows={2}
          />

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending || grnOptions.length === 0}
            >
              {create.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
