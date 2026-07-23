import { useEffect } from 'react';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getErrorMessage } from '@/api/errors';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import {
  createSiteQuality,
  updateSiteQuality,
  type SiteQuality,
} from '@/site-quality/api';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(4000).optional(),
  findings: z.string().max(4000).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  projectId: string;
  record?: SiteQuality | null;
};

const EMPTY: FormValues = {
  title: '',
  description: '',
  findings: '',
};

export function SiteQualityFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  record,
}: Props) {
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && record) {
      reset({
        title: record.title,
        description: record.description ?? '',
        findings: record.findings ?? '',
      });
    } else {
      reset(EMPTY);
    }
  }, [open, mode, record, reset]);

  const create = useMutation({
    mutationFn: createSiteQuality,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-quality', projectId] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateSiteQuality>[1];
    }) => updateSiteQuality(id, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-quality', projectId] }),
  });

  const busy = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const description = values.description?.trim() ?? '';
    const findings = values.findings?.trim()
      ? values.findings.trim()
      : null;
    try {
      if (mode === 'edit' && record) {
        await update.mutateAsync({
          id: record.id,
          input: {
            title: values.title.trim(),
            description,
            findings,
          },
        });
        success('Site quality updated');
      } else {
        await create.mutateAsync({
          projectId,
          title: values.title.trim(),
          description: description || undefined,
          findings,
        });
        success('Site quality created');
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
        data-testid="site-quality-form-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            {mode === 'create'
              ? 'New quality inspection'
              : 'Edit quality record'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requires site_quality.manage. Updates apply to open records only
            (not closed / cancelled).
          </Typography>

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
            name="findings"
            control={control}
            label="Findings (optional)"
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
