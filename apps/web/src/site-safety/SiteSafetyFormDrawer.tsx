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
import { formDrawerPaperSx } from '@/components/forms';
import {
  createSiteSafety,
  updateSiteSafety,
  type SiteSafety,
  type SiteSafetySeverity,
  type SiteSafetyType,
} from '@/site-safety/api';

const SAFETY_TYPES: SiteSafetyType[] = [
  'near_miss',
  'accident',
  'ppe',
  'toolbox_talk',
  'safety_inspection',
];

const SEVERITIES: SiteSafetySeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

const schema = z
  .object({
    type: z.enum([
      'near_miss',
      'accident',
      'ppe',
      'toolbox_talk',
      'safety_inspection',
    ]),
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string().max(4000).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    ppeItem: z.string().max(200).optional(),
    attendeeName: z.string().max(120).optional(),
    attendeeRole: z.string().max(80).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'ppe' && !values.ppeItem?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ppeItem'],
        message: 'PPE checklist item is required',
      });
    }
    if (values.type === 'toolbox_talk' && !values.attendeeName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['attendeeName'],
        message: 'At least one attendee is required',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  projectId: string;
  record?: SiteSafety | null;
};

const EMPTY: FormValues = {
  type: 'near_miss',
  title: '',
  description: '',
  severity: 'medium',
  ppeItem: '',
  attendeeName: '',
  attendeeRole: '',
};

function typeLabel(value: SiteSafetyType): string {
  return value.replaceAll('_', ' ');
}

export function SiteSafetyFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  record,
}: Props) {
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && record) {
      reset({
        type: record.type,
        title: record.title,
        description: record.description ?? '',
        severity: record.severity,
        ppeItem: record.ppeChecklist?.[0]?.item ?? '',
        attendeeName: record.attendees[0]?.name ?? '',
        attendeeRole: record.attendees[0]?.role ?? '',
      });
    } else {
      reset(EMPTY);
    }
  }, [open, mode, record, reset]);

  const create = useMutation({
    mutationFn: createSiteSafety,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-safety', projectId] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateSiteSafety>[1];
    }) => updateSiteSafety(id, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-safety', projectId] }),
  });

  const busy = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const description = values.description?.trim() ?? '';
    const ppeChecklist =
      values.type === 'ppe' && values.ppeItem?.trim()
        ? [
            {
              item: values.ppeItem.trim(),
              compliant: record?.ppeChecklist?.[0]?.compliant ?? false,
              notes: record?.ppeChecklist?.[0]?.notes ?? null,
            },
          ]
        : undefined;
    const attendees =
      values.type === 'toolbox_talk' && values.attendeeName?.trim()
        ? [
            {
              name: values.attendeeName.trim(),
              role: values.attendeeRole?.trim()
                ? values.attendeeRole.trim()
                : null,
            },
          ]
        : undefined;

    try {
      if (mode === 'edit' && record) {
        await update.mutateAsync({
          id: record.id,
          input: {
            title: values.title.trim(),
            description,
            severity: values.severity,
            ...(ppeChecklist ? { ppeChecklist } : {}),
            ...(attendees ? { attendees } : {}),
          },
        });
        success('Site safety updated');
      } else {
        await create.mutateAsync({
          projectId,
          type: values.type,
          title: values.title.trim(),
          description: description || undefined,
          severity: values.severity,
          ppeChecklist: ppeChecklist ?? null,
          attendees,
        });
        success('Site safety created');
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
        paper: { sx: formDrawerPaperSx(460) },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={onSubmit}
        data-testid="site-safety-form-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            {mode === 'create' ? 'New safety record' : 'Edit safety record'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requires safety.manage. Updates apply to open / investigating
            records only. Type cannot change after create.
          </Typography>

          <FormSelect
            name="type"
            control={control}
            label="Type"
            disabled={mode === 'edit'}
            options={SAFETY_TYPES.map((value) => ({
              value,
              label: typeLabel(value),
            }))}
          />
          <FormTextField
            name="title"
            control={control}
            label="Title"
            required
          />
          <FormSelect
            name="severity"
            control={control}
            label="Severity"
            options={SEVERITIES.map((value) => ({
              value,
              label: value,
            }))}
          />
          <FormTextField
            name="description"
            control={control}
            label="Description"
            multiline
            minRows={3}
          />

          {selectedType === 'ppe' ? (
            <FormTextField
              name="ppeItem"
              control={control}
              label="PPE checklist item"
              required
              helperText="At least one checklist item is required for PPE records."
            />
          ) : null}

          {selectedType === 'toolbox_talk' ? (
            <>
              <FormTextField
                name="attendeeName"
                control={control}
                label="Attendee name"
                required
                helperText="Toolbox talks require at least one attendee."
              />
              <FormTextField
                name="attendeeRole"
                control={control}
                label="Attendee role (optional)"
              />
            </>
          ) : null}

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
