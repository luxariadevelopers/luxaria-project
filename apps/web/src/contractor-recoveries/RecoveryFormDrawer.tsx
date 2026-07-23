import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button, Drawer, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { AsyncSelect } from '@/components/forms/AsyncSelect';
import { FormSection } from '@/components/forms/FormSection';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { RECOVERY_TYPE_OPTIONS } from './labels';
import type { PublicContractorRecovery } from './api';
import { useCreateContractorRecovery } from './useContractorRecoveries';
import { formDrawerPaperSx } from '@/components/forms';
import {
  defaultRecoveryFormValues,
  formValuesToCreateInput,
  recoveryFormSchema,
  type RecoveryFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canManage: boolean;
  onSaved?: (row: PublicContractorRecovery) => void;
};

export function RecoveryFormDrawer({
  open,
  onClose,
  projectId,
  canManage,
  onSaved,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateContractorRecovery();
  const { control, handleSubmit, reset } = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: defaultRecoveryFormValues(projectId),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultRecoveryFormValues(projectId));
  }, [open, projectId, reset]);

  const loadContractors = async (input: string) => {
    const rows = await searchContractors({ search: input, limit: 10 });
    return rows.map((row) => ({
      value: row.id,
      label: [row.contractorCode, row.legalName].filter(Boolean).join(' — '),
    }));
  };

  const onSubmit = async (values: RecoveryFormValues) => {
    try {
      const saved = await create.mutateAsync(
        formValuesToCreateInput({ ...values, projectId }),
      );
      success('Recovery draft created');
      onSaved?.(saved);
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
        paper: { sx: formDrawerPaperSx(480) },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%', overflow: 'auto' }}
        data-testid="recovery-form-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          New contractor recovery
        </Typography>
        <Stack spacing={3}>
          <FormSection title="Recovery">
            <AsyncSelect
              name="contractorId"
              control={control}
              label="Contractor"
              loadOptions={loadContractors}
              disabled={!canManage}
              required
            />
            <FormSelect
              name="type"
              control={control}
              label="Type"
              options={RECOVERY_TYPE_OPTIONS}
              disabled={!canManage}
            />
            <FormTextField
              name="amount"
              control={control}
              label="Amount"
              type="number"
              disabled={!canManage}
            />
            <FormTextField
              name="workOrderId"
              control={control}
              label="Work order id (optional)"
              disabled={!canManage}
            />
            <FormTextField
              name="billId"
              control={control}
              label="Bill id (optional)"
              disabled={!canManage}
            />
            <FormTextField
              name="description"
              control={control}
              label="Description"
              disabled={!canManage}
            />
            <FormTextField
              name="notes"
              control={control}
              label="Notes"
              multiline
              minRows={2}
              disabled={!canManage}
            />
          </FormSection>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            {canManage ? (
              <Button
                type="submit"
                variant="contained"
                disabled={create.isPending}
              >
                Create draft
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
