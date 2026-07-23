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
  createSiteDiaryEntry,
  updateSiteDiaryEntry,
  type PublicSiteDiaryEntry,
  type SiteDiaryEntryType,
} from '@/site-diary/api';

const ENTRY_TYPES: SiteDiaryEntryType[] = [
  'meeting',
  'delay',
  'visitor',
  'instruction',
  'risk',
  'other',
];

const schema = z.object({
  entryDate: z.string().min(1, 'Date is required'),
  entryType: z.enum([
    'meeting',
    'delay',
    'visitor',
    'instruction',
    'risk',
    'other',
  ]),
  title: z.string().trim().min(1, 'Title is required').max(240),
  description: z.string().max(5000).optional(),
  visitorName: z.string().max(160).optional(),
  visitorOrganization: z.string().max(160).optional(),
  visitorPurpose: z.string().max(160).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  projectId: string;
  entry?: PublicSiteDiaryEntry | null;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: FormValues = {
  entryDate: todayIsoDate(),
  entryType: 'other',
  title: '',
  description: '',
  visitorName: '',
  visitorOrganization: '',
  visitorPurpose: '',
};

export function SiteDiaryFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  entry,
}: Props) {
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && entry) {
      const first = entry.visitors[0];
      reset({
        entryDate: entry.entryDate.slice(0, 10),
        entryType: entry.entryType,
        title: entry.title,
        description: entry.description ?? '',
        visitorName: first?.name ?? '',
        visitorOrganization: first?.organization ?? '',
        visitorPurpose: first?.purpose ?? '',
      });
    } else {
      reset({ ...EMPTY, entryDate: todayIsoDate() });
    }
  }, [open, mode, entry, reset]);

  const create = useMutation({
    mutationFn: createSiteDiaryEntry,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-diary', projectId] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateSiteDiaryEntry>[1];
    }) => updateSiteDiaryEntry(id, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-diary', projectId] }),
  });

  const busy = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const description = values.description?.trim()
      ? values.description.trim()
      : null;
    const visitorName = values.visitorName?.trim() ?? '';
    const visitors = visitorName
      ? [
          {
            name: visitorName,
            organization: values.visitorOrganization?.trim()
              ? values.visitorOrganization.trim()
              : null,
            purpose: values.visitorPurpose?.trim()
              ? values.visitorPurpose.trim()
              : null,
          },
        ]
      : [];

    try {
      if (mode === 'edit' && entry) {
        await update.mutateAsync({
          id: entry.id,
          input: {
            entryDate: values.entryDate,
            entryType: values.entryType,
            title: values.title.trim(),
            description,
            visitors,
          },
        });
        success('Diary entry updated');
      } else {
        await create.mutateAsync({
          projectId,
          entryDate: values.entryDate,
          entryType: values.entryType,
          title: values.title.trim(),
          description,
          visitors: visitors.length > 0 ? visitors : undefined,
        });
        success('Diary entry created');
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
        data-testid="site-diary-form-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            {mode === 'create' ? 'New diary entry' : 'Edit diary entry'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requires site_diary.manage. Optional visitor fields map to the first
            visitor on the entry.
          </Typography>

          <FormTextField
            name="entryDate"
            control={control}
            label="Date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormSelect
            name="entryType"
            control={control}
            label="Type"
            options={ENTRY_TYPES.map((value) => ({
              value,
              label: value,
            }))}
          />
          <FormTextField
            name="title"
            control={control}
            label="Title"
            required
          />
          <FormTextField
            name="description"
            control={control}
            label="Description"
            multiline
            minRows={3}
          />
          <FormTextField
            name="visitorName"
            control={control}
            label="Visitor name (optional)"
          />
          <FormTextField
            name="visitorOrganization"
            control={control}
            label="Visitor organization"
          />
          <FormTextField
            name="visitorPurpose"
            control={control}
            label="Visitor purpose"
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
