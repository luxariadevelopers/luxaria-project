import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormSetValue,
} from 'react-hook-form';
import { getErrorMessage } from '@/api/errors';
import { FormSelect } from '@/components/forms/FormSelect';
import { FormTextField } from '@/components/forms/FormTextField';
import { useNotify } from '@/components/NotificationProvider';
import { EmptyState, RetryPanel } from '@/components/errors';
import { AvailableStockIndicator } from './AvailableStockIndicator';
import { MATERIAL_UNIT_OPTIONS } from './labels';
import { MaterialUnit } from './types';
import {
  useAvailableStock,
  useCreateMaterialIssue,
  useMaterialsForIssue,
  useUsersForIssue,
} from './useMaterialIssues';
import {
  issueCreateSchema,
  type IssueCreateFormValues,
} from './validation';
import { WorkLocationBoqSelector } from './WorkLocationBoqSelector';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canViewBoq: boolean;
  canViewMaterials: boolean;
  canViewUsers: boolean;
  canViewStock: boolean;
  onCreated?: (id: string) => void;
};

/**
 * Create draft material issue (`POST /material-issues`, `stock.issue`).
 * Client blocks quantity above available stock when balance is loaded.
 */
export function IssueForm({
  open,
  onClose,
  projectId,
  canViewBoq,
  canViewMaterials,
  canViewUsers,
  canViewStock,
  onCreated,
}: Props) {
  const create = useCreateMaterialIssue();
  const { success, error: notifyError } = useNotify();
  const [materialSearch, setMaterialSearch] = useState('');

  const materialsQuery = useMaterialsForIssue(
    materialSearch,
    open && canViewMaterials,
  );
  const usersQuery = useUsersForIssue(projectId, open && canViewUsers);

  const { control, handleSubmit, reset, setValue } =
    useForm<IssueCreateFormValues>({
      resolver: zodResolver(issueCreateSchema),
      defaultValues: {
        projectId,
        issueDate: new Date().toISOString().slice(0, 10),
        receivedBy: '',
        contractorId: '',
        blockId: '',
        floorId: '',
        boqItemId: '',
        workLocation: '',
        storeLocation: '',
        notes: '',
        items: [
          {
            materialId: '',
            quantity: 1,
            unit: MaterialUnit.Bag,
            batch: '',
            notes: '',
          },
        ],
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = useWatch({ control, name: 'items' });
  const storeLocation = useWatch({ control, name: 'storeLocation' });

  const materialOptions = useMemo(
    () =>
      (materialsQuery.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.materialCode} · ${m.name}`,
      })),
    [materialsQuery.data],
  );

  const userOptions = useMemo(
    () =>
      (usersQuery.data ?? []).map((u) => ({
        value: u.id,
        label: `${u.fullName} (${u.userCode})`,
      })),
    [usersQuery.data],
  );

  useEffect(() => {
    if (!open) {
      reset({
        projectId,
        issueDate: new Date().toISOString().slice(0, 10),
        receivedBy: '',
        contractorId: '',
        blockId: '',
        floorId: '',
        boqItemId: '',
        workLocation: '',
        storeLocation: '',
        notes: '',
        items: [
          {
            materialId: '',
            quantity: 1,
            unit: MaterialUnit.Bag,
            batch: '',
            notes: '',
          },
        ],
      });
      setMaterialSearch('');
    } else {
      setValue('projectId', projectId);
    }
  }, [open, projectId, reset, setValue]);

  useEffect(() => {
    if (!open) return;
    watchedItems?.forEach((item, index) => {
      if (!item?.materialId) return;
      const material = materialsQuery.data?.find(
        (m) => m.id === item.materialId,
      );
      if (material) {
        setValue(`items.${index}.materialLabel`, material.materialCode);
        setValue(`items.${index}.unit`, material.baseUnit);
      }
    });
  }, [watchedItems, materialsQuery.data, open, setValue]);

  const onSubmit = async (values: IssueCreateFormValues) => {
    try {
      const created = await create.mutateAsync({
        projectId: values.projectId,
        issueDate: values.issueDate,
        receivedBy: values.receivedBy,
        contractorId: values.contractorId || null,
        blockId: values.blockId || null,
        floorId: values.floorId?.trim() || null,
        boqItemId: values.boqItemId,
        workLocation: values.workLocation.trim(),
        storeLocation: values.storeLocation?.trim() || null,
        notes: values.notes?.trim() || null,
        items: values.items.map((item) => ({
          materialId: item.materialId,
          quantity: item.quantity,
          unit: item.unit,
          batch: item.batch?.trim() || null,
          notes: item.notes?.trim() || null,
        })),
      });
      success('Material issue draft created');
      onClose();
      onCreated?.(created.id);
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
        paper: { sx: { width: { xs: '100%', sm: 520 } } },
      }}
    >
      <Box
        sx={{ p: 2.5 }}
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        data-testid="issue-form"
      >
        <Stack spacing={2}>
          <Typography variant="h6">New material issue</Typography>
          <Typography variant="body2" color="text.secondary">
            Requires stock.issue. Stock is reduced only on confirm
            (stock.adjust). Quantity cannot exceed available stock.
          </Typography>

          <FormTextField
            name="issueDate"
            control={control}
            label="Issue date"
            type="date"
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />

          {canViewUsers ? (
            usersQuery.error ? (
              <RetryPanel
                error={usersQuery.error}
                onRetry={() => void usersQuery.refetch()}
                forceRetry
              />
            ) : (
              <FormSelect
                name="receivedBy"
                control={control}
                label="Received by"
                options={userOptions}
              />
            )
          ) : (
            <FormTextField
              name="receivedBy"
              control={control}
              label="Received by (user id)"
              required
              helperText="Need user.view to browse users"
            />
          )}

          <WorkLocationBoqSelector
            control={control}
            projectId={projectId}
            canViewBoq={canViewBoq}
          />

          <FormTextField
            name="storeLocation"
            control={control}
            label="Store / yard location"
            helperText="Stock balance location (empty = default)"
          />
          <FormTextField
            name="notes"
            control={control}
            label="Notes"
            multiline
            minRows={2}
          />

          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Typography variant="subtitle2">Items</Typography>
            <Button
              size="small"
              startIcon={<AddOutlinedIcon />}
              onClick={() =>
                append({
                  materialId: '',
                  quantity: 1,
                  unit: MaterialUnit.Bag,
                  batch: '',
                  notes: '',
                })
              }
            >
              Add line
            </Button>
          </Stack>

          {canViewMaterials && materialsQuery.error ? (
            <RetryPanel
              error={materialsQuery.error}
              onRetry={() => void materialsQuery.refetch()}
              forceRetry
            />
          ) : null}

          {!canViewMaterials ? (
            <EmptyState
              title="Material picker limited"
              description="Need material.view. Paste material ObjectIds in each line."
            />
          ) : (
            <TextField
              size="small"
              label="Search materials"
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'material-search' } }}
            />
          )}

          {fields.map((field, index) => {
            const line = watchedItems?.[index];
            return (
              <Stack
                key={field.id}
                spacing={1}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between' }}
                >
                  <Typography variant="caption">Line {index + 1}</Typography>
                  <IconButton
                    size="small"
                    aria-label="Remove line"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {canViewMaterials && materialOptions.length > 0 ? (
                  <FormSelect
                    name={`items.${index}.materialId`}
                    control={control}
                    label="Material"
                    options={materialOptions}
                  />
                ) : (
                  <FormTextField
                    name={`items.${index}.materialId`}
                    control={control}
                    label="Material id"
                    required
                  />
                )}

                <Stack direction="row" spacing={1}>
                  <FormTextField
                    name={`items.${index}.quantity`}
                    control={control}
                    label="Quantity"
                    type="number"
                    required
                  />
                  <FormSelect
                    name={`items.${index}.unit`}
                    control={control}
                    label="Unit"
                    options={MATERIAL_UNIT_OPTIONS}
                  />
                </Stack>

                {canViewStock ? (
                  <>
                    <AvailableStockIndicator
                      projectId={projectId}
                      materialId={line?.materialId}
                      storeLocation={storeLocation}
                      requestedQuantity={line?.quantity}
                    />
                    <StockValueWriter
                      projectId={projectId}
                      materialId={line?.materialId}
                      storeLocation={storeLocation}
                      index={index}
                      setValue={setValue}
                    />
                  </>
                ) : null}

                <FormTextField
                  name={`items.${index}.batch`}
                  control={control}
                  label="Batch"
                />
              </Stack>
            );
          })}

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={create.isPending}
            >
              {create.isPending ? 'Creating…' : 'Create draft'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

function StockValueWriter({
  projectId,
  materialId,
  storeLocation,
  index,
  setValue,
}: {
  projectId: string;
  materialId: string | undefined;
  storeLocation: string | null | undefined;
  index: number;
  setValue: UseFormSetValue<IssueCreateFormValues>;
}) {
  const stock = useAvailableStock({
    projectId,
    materialId,
    location: storeLocation ?? '',
    enabled: Boolean(materialId),
  });

  useEffect(() => {
    if (stock.data) {
      setValue(
        `items.${index}.availableBaseQuantity`,
        stock.data.quantityInBaseUnit,
      );
    }
  }, [stock.data, index, setValue]);

  return null;
}
