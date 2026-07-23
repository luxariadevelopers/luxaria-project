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
  createSiteIssue,
  updateSiteIssue,
  type PublicSiteIssue,
  type SiteIssueSeverity,
  type SiteIssueType,
} from '@/site-issues/api';

const ISSUE_TYPES: SiteIssueType[] = [
  'delay',
  'material_shortage',
  'labour_shortage',
  'equipment_failure',
  'design_clarification',
  'other',
];

const SEVERITIES: SiteIssueSeverity[] = [
  'low',
  'medium',
  'high',
  'critical',
];

const schema = z.object({
  type: z.enum([
    'delay',
    'material_shortage',
    'labour_shortage',
    'equipment_failure',
    'design_clarification',
    'other',
  ]),
  title: z.string().trim().min(1, 'Title is required').max(240),
  description: z.string().max(5000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  projectId: string;
  issue?: PublicSiteIssue | null;
};

const EMPTY: FormValues = {
  type: 'other',
  title: '',
  description: '',
  severity: 'medium',
};

function typeLabel(value: SiteIssueType): string {
  return value.replaceAll('_', ' ');
}

export function SiteIssueFormDrawer({
  open,
  onClose,
  mode,
  projectId,
  issue,
}: Props) {
  const qc = useQueryClient();
  const { success, error: notifyError } = useNotify();

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && issue) {
      reset({
        type: issue.type,
        title: issue.title,
        description: issue.description ?? '',
        severity: issue.severity,
      });
    } else {
      reset(EMPTY);
    }
  }, [open, mode, issue, reset]);

  const create = useMutation({
    mutationFn: createSiteIssue,
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-issues', projectId] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Parameters<typeof updateSiteIssue>[1];
    }) => updateSiteIssue(id, input),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ['site-issues', projectId] }),
  });

  const busy = create.isPending || update.isPending;

  const onSubmit = handleSubmit(async (values) => {
    const description = values.description?.trim()
      ? values.description.trim()
      : null;
    try {
      if (mode === 'edit' && issue) {
        await update.mutateAsync({
          id: issue.id,
          input: {
            type: values.type,
            title: values.title.trim(),
            description,
            severity: values.severity,
          },
        });
        success('Site issue updated');
      } else {
        await create.mutateAsync({
          projectId,
          type: values.type,
          title: values.title.trim(),
          description,
          severity: values.severity,
        });
        success('Site issue created');
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
        data-testid="site-issue-form-drawer"
      >
        <Stack spacing={2}>
          <Typography variant="h6">
            {mode === 'create' ? 'New site issue' : 'Edit site issue'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requires site_issue.create. Updates apply to open / assigned issues
            only.
          </Typography>

          <FormSelect
            name="type"
            control={control}
            label="Type"
            options={ISSUE_TYPES.map((value) => ({
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
