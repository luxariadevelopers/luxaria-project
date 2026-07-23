import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import {
  createEquipment,
  updateEquipment,
  type Equipment,
  type EquipmentOwnership,
  type EquipmentStatus,
} from '@/equipment/api';

const OWNERSHIPS: EquipmentOwnership[] = ['own', 'hire'];
const STATUSES: EquipmentStatus[] = [
  'available',
  'allocated',
  'maintenance',
  'breakdown',
  'retired',
];

const schema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(40),
  name: z.string().trim().min(1, 'Name is required').max(200),
  type: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  ownership: z.enum(['own', 'hire']),
  status: z.enum([
    'available',
    'allocated',
    'maintenance',
    'breakdown',
    'retired',
  ]),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  projectId: string;
  equipment?: Equipment | null;
};

const EMPTY: FormValues = {
  code: '',
  name: '',
  type: '',
  category: '',
  ownership: 'own',
  status: 'available',
  notes: '',
};

export function EquipmentFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  equipment,
}: Props) {
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && equipment) {
      reset({
        code: equipment.code,
        name: equipment.name,
        type: equipment.type ?? '',
        category: equipment.category ?? '',
        ownership: equipment.ownership,
        status: equipment.status,
        notes: equipment.notes ?? '',
      });
    } else {
      reset(EMPTY);
    }
  }, [open, mode, equipment, reset]);

  const create = useMutation({
    mutationFn: createEquipment,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['equipment', projectId] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateEquipment>[1];
    }) => updateEquipment(id, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['equipment', projectId] }),
  });

  const busy = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      type: values.type?.trim() ? values.type.trim() : null,
      category: values.category?.trim() ? values.category.trim() : null,
      ownership: values.ownership,
      status: values.status,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    try {
      if (mode === 'edit' && equipment) {
        await update.mutateAsync({ id: equipment.id, input: payload });
        success('Equipment updated');
      } else {
        await create.mutateAsync({ projectId, ...payload });
        success('Equipment created');
      }
      onClose();
    } catch (err) {
      notifyError(
        getErrorMessage(
          err,
          mode === 'edit' ? 'Update failed' : 'Create failed',
        ),
      );
    }
  });

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 440 } } },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={onSubmit}
        data-testid="equipment-form-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            {mode === 'create' ? 'New equipment' : 'Edit equipment'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requires equipment.manage. Master register fields only — allocation,
            fuel, and utilization use separate APIs.
          </Typography>

          <FormTextField name="code" control={control} label="Code" required />
          <FormTextField name="name" control={control} label="Name" required />
          <FormTextField name="type" control={control} label="Type" />
          <FormTextField name="category" control={control} label="Category" />
          <FormSelect
            name="ownership"
            control={control}
            label="Ownership"
            options={OWNERSHIPS.map((value) => ({
              value,
              label: value,
            }))}
          />
          <FormSelect
            name="status"
            control={control}
            label="Status"
            options={STATUSES.map((value) => ({
              value,
              label: value,
            }))}
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
