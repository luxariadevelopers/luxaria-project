import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { searchContractors } from '@/api/searchLists';
import { AsyncSelect } from '@/components/forms/AsyncSelect';
import { DateInput } from '@/components/forms/DateInput';
import { FormSection } from '@/components/forms/FormSection';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { fetchMaterials } from '@/purchase-requests/api';
import { useCreateMaterialReconciliation } from './useMaterialReconciliations';
import {
  defaultMaterialReconciliationFormValues,
  formValuesToCreateInput,
  materialReconciliationFormSchema,
  type MaterialReconciliationFormValues,
} from './validation';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canManage: boolean;
  canViewContractors: boolean;
  canViewMaterials: boolean;
};

export function MaterialReconciliationFormDrawer({
  open,
  onClose,
  projectId,
  canManage,
  canViewContractors,
  canViewMaterials,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const create = useCreateMaterialReconciliation();

  const { control, handleSubmit, reset } =
    useForm<MaterialReconciliationFormValues>({
      resolver: zodResolver(materialReconciliationFormSchema),
      defaultValues: defaultMaterialReconciliationFormValues(),
    });

  useEffect(() => {
    if (!open) return;
    reset(defaultMaterialReconciliationFormValues());
  }, [open, reset]);

  const loadContractors = useMemo(
    () => async (input: string) => {
      if (!canViewContractors) return [];
      const rows = await searchContractors({ search: input, limit: 20 });
      return rows.map((row) => ({
        value: row.id,
        label: [row.contractorCode, row.legalName].filter(Boolean).join(' — '),
      }));
    },
    [canViewContractors],
  );

  const loadMaterials = useMemo(
    () => async (input: string) => {
      if (!canViewMaterials) return [];
      const rows = await fetchMaterials({ search: input, limit: 40 });
      return rows.map((row) => ({
        value: row.id,
        label: [row.materialCode, row.name].filter(Boolean).join(' — '),
      }));
    },
    [canViewMaterials],
  );

  const onSubmit = async (values: MaterialReconciliationFormValues) => {
    if (!canManage) return;
    try {
      await create.mutateAsync(formValuesToCreateInput(values, projectId));
      success('Material reconciliation draft created');
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
        paper: { sx: { width: { xs: '100%', sm: 520, md: 600 } } },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ p: 3, height: '100%', overflow: 'auto' }}
        data-testid="material-reconciliation-form-drawer"
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          New material reconciliation
        </Typography>

        <Stack spacing={3}>
          {!canViewContractors ? (
            <Alert severity="warning">
              Missing `contractor.view` — contractor picker unavailable.
            </Alert>
          ) : null}
          {!canViewMaterials ? (
            <Alert severity="warning">
              Missing `material.view` — material picker unavailable.
            </Alert>
          ) : null}

          <FormSection title="Parties">
            <AsyncSelect
              name="contractorId"
              control={control}
              label="Contractor"
              loadOptions={loadContractors}
              disabled={!canManage || !canViewContractors}
              required
            />
            <AsyncSelect
              name="materialId"
              control={control}
              label="Material"
              loadOptions={loadMaterials}
              disabled={!canManage || !canViewMaterials}
              required
            />
            <FormTextField
              name="workOrderId"
              control={control}
              label="Work order id (optional)"
              disabled={!canManage}
            />
          </FormSection>

          <FormSection title="Period">
            <DateInput
              name="periodFrom"
              control={control}
              label="From"
              required
              disabled={!canManage}
            />
            <DateInput
              name="periodTo"
              control={control}
              label="To"
              required
              disabled={!canManage}
            />
          </FormSection>

          <FormSection title="Quantities">
            <FormTextField
              name="issuedQuantity"
              control={control}
              label="Issued quantity"
              type="number"
              required
              disabled={!canManage}
            />
            <FormTextField
              name="theoreticalConsumption"
              control={control}
              label="Theoretical consumption"
              type="number"
              required
              disabled={!canManage}
            />
            <FormTextField
              name="approvedWastage"
              control={control}
              label="Approved wastage"
              type="number"
              required
              disabled={!canManage}
            />
            <FormTextField
              name="returnedQuantity"
              control={control}
              label="Returned quantity"
              type="number"
              required
              disabled={!canManage}
            />
            <FormTextField
              name="unitRate"
              control={control}
              label="Unit rate (₹)"
              type="number"
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
            <Button
              type="submit"
              variant="contained"
              disabled={!canManage || create.isPending}
            >
              Create draft
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
