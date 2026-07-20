import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { DateInput, FormSelect, FormTextField } from '@/components/forms';
import {
  BOQ_VERSION_TYPE_OPTIONS,
  formatBoqVersionLabel,
} from './labels';
import { BoqVersionType, type PublicBoqVersion } from './types';
import {
  createBoqVersionSchema,
  type CreateBoqVersionFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateBoqVersionFormValues) => Promise<void>;
  versions: readonly PublicBoqVersion[];
  submitting?: boolean;
};

export function CreateVersionDialog({
  open,
  onClose,
  onSubmit,
  versions,
  submitting = false,
}: Props) {
  const { control, handleSubmit, reset, watch } =
    useForm<CreateBoqVersionFormValues>({
      resolver: zodResolver(createBoqVersionSchema),
      defaultValues: {
        versionType: BoqVersionType.Original,
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason: '',
        basedOnVersionId: '',
        costImpact: undefined,
        timeImpact: undefined,
      },
    });

  const versionType = watch('versionType');
  const basedOnOptions = versions
    .filter((v) => v.status === 'active' || v.status === 'superseded')
    .map((v) => ({
      value: v.id,
      label: formatBoqVersionLabel(v),
    }));

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const hasOriginal = versions.some(
      (v) => v.versionType === BoqVersionType.Original,
    );
    const active = versions.find((v) => v.status === 'active');
    reset({
      versionType: hasOriginal
        ? BoqVersionType.Revision
        : BoqVersionType.Original,
      effectiveDate: new Date().toISOString().slice(0, 10),
      reason: '',
      basedOnVersionId: active?.id ?? '',
      costImpact: undefined,
      timeImpact: undefined,
    });
  }, [open, reset, versions]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create BOQ version</DialogTitle>
      <DialogContent>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
          component="form"
          id="create-boq-version-form"
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              basedOnVersionId: values.basedOnVersionId || undefined,
            });
          })}
        >
          <FormSelect
            name="versionType"
            control={control}
            label="Version type"
            options={BOQ_VERSION_TYPE_OPTIONS}
            required
          />
          <DateInput
            name="effectiveDate"
            control={control}
            label="Effective date"
            required
          />
          <FormTextField
            name="reason"
            control={control}
            label="Reason"
            required
            multiline
            minRows={2}
          />
          {versionType !== BoqVersionType.Original && (
            <>
              <FormSelect
                name="basedOnVersionId"
                control={control}
                label="Based on version"
                options={[
                  {
                    value: '',
                    label: 'Default (current active)',
                  },
                  ...basedOnOptions,
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Required by Nest for revision / variation / change order;
                defaults to active.
              </Typography>
            </>
          )}
          <FormTextField
            name="timeImpact"
            control={control}
            label="Time impact (days)"
            type="number"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="create-boq-version-form"
          variant="contained"
          disabled={submitting}
        >
          Create draft
        </Button>
      </DialogActions>
    </Dialog>
  );
}
