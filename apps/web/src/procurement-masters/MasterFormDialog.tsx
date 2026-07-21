import { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import type { MasterResource, MasterRow } from './types';
import { useCreateMaster, useUpdateMaster } from './useProcurementMasters';

const baseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'Alphanumeric, underscore, or hyphen only'),
  name: z.string().trim().min(1, 'Name is required').max(200),
  days: z.coerce.number().min(0).optional(),
  description: z.string().trim().max(1000).optional(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof baseSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  resource: MasterResource;
  mode: 'create' | 'edit';
  row?: MasterRow | null;
};

function extraFields(resource: MasterResource): Array<keyof FormValues> {
  if (resource === 'payment-terms') return ['days'];
  if (resource === 'delivery-terms') return ['description'];
  if (resource === 'tax-rules') return ['gstPercent'];
  return [];
}

function toDefaults(row?: MasterRow | null): FormValues {
  return {
    code: row?.code ?? '',
    name: row?.name ?? '',
    days: 'days' in (row ?? {}) ? Number((row as { days: number }).days) : 30,
    description:
      'description' in (row ?? {})
        ? String((row as { description: string | null }).description ?? '')
        : '',
    gstPercent:
      'gstPercent' in (row ?? {})
        ? Number((row as { gstPercent: number }).gstPercent)
        : 18,
  };
}

export function MasterFormDialog({
  open,
  onClose,
  resource,
  mode,
  row,
}: Props) {
  const create = useCreateMaster(resource);
  const update = useUpdateMaster(resource);
  const { success, error: notifyError } = useNotify();
  const extras = extraFields(resource);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: toDefaults(row),
  });

  useEffect(() => {
    if (open) reset(toDefaults(row));
  }, [open, row, reset]);

  const busy = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = {
      code: values.code.trim(),
      name: values.name.trim(),
    };
    if (resource === 'payment-terms') payload.days = Number(values.days ?? 0);
    if (resource === 'delivery-terms') {
      payload.description = values.description?.trim() || null;
    }
    if (resource === 'tax-rules') {
      payload.gstPercent = Number(values.gstPercent ?? 0);
    }

    try {
      if (mode === 'edit' && row) {
        await update.mutateAsync({ id: row.id, input: payload });
        success('Master updated');
      } else {
        await create.mutateAsync(payload);
        success('Master created');
      }
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      data-testid="procurement-master-form-dialog"
    >
      <DialogTitle>
        {mode === 'edit' ? 'Edit' : 'Add'} {resource.replace(/-/g, ' ')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }} component="form" onSubmit={onSubmit}>
          <TextField
            label="Code"
            size="small"
            required
            disabled={busy || mode === 'edit'}
            error={Boolean(errors.code)}
            helperText={errors.code?.message}
            {...register('code')}
          />
          <TextField
            label="Name"
            size="small"
            required
            disabled={busy}
            error={Boolean(errors.name)}
            helperText={errors.name?.message}
            {...register('name')}
          />
          {extras.includes('days') ? (
            <TextField
              label="Days"
              size="small"
              type="number"
              required
              disabled={busy}
              error={Boolean(errors.days)}
              helperText={errors.days?.message}
              {...register('days')}
            />
          ) : null}
          {extras.includes('description') ? (
            <TextField
              label="Description"
              size="small"
              multiline
              minRows={2}
              disabled={busy}
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              {...register('description')}
            />
          ) : null}
          {extras.includes('gstPercent') ? (
            <TextField
              label="GST %"
              size="small"
              type="number"
              required
              disabled={busy}
              error={Boolean(errors.gstPercent)}
              helperText={errors.gstPercent?.message}
              {...register('gstPercent')}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void onSubmit()} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
