import { useEffect, useMemo } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FormProvider,
  useForm,
  type Resolver,
} from 'react-hook-form';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { BoqItemStatusChip } from '@/boq/BoqItemStatusChip';
import { ItemForm } from '@/boq/ItemForm';
import { BOQ_ROUTES } from '@/boq/routes';
import { resolveBoqCapabilities } from '@/boq/roleAccess';
import {
  useBoqHierarchy,
  useBoqItemDetail,
  useBoqVersionDetail,
  useBoqVersions,
  useCreateBoqItem,
  useUpdateBoqItem,
} from '@/boq/useBoq';
import {
  boqItemFormSchema,
  defaultBoqItemFormValues,
  shapeBoqItemCreatePayload,
  shapeBoqItemUpdatePayload,
  type BoqItemFormValues,
} from '@/boq/validation';
import { resolveBoqItemActions } from '@/boq/workflowActions';
import { applyApiFieldErrors } from '@/components/forms';
import {
  EmptyState,
  FieldErrorSummary,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';

/**
 * BOQ item create / edit (Micro Phase 079).
 * Route: `/project-control/boq/items/:id` (`new` = create).
 */
export function BoqItemEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id || id === 'new';
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveBoqCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const canView = Boolean(access) && caps.canView;
  const canManage = caps.canManage;
  const projectReady = Boolean(selectedProjectId);
  const enabled = canView && projectReady;

  const itemQuery = useBoqItemDetail(id, enabled && !isCreate);
  const hierarchyQuery = useBoqHierarchy(selectedProjectId, enabled);
  const versionsQuery = useBoqVersions(selectedProjectId, enabled);
  const versionQuery = useBoqVersionDetail(
    itemQuery.data?.versionId,
    enabled && Boolean(itemQuery.data?.versionId),
  );

  const create = useCreateBoqItem(selectedProjectId ?? '');
  const update = useUpdateBoqItem();

  const methods = useForm<BoqItemFormValues>({
    resolver: zodResolver(
      boqItemFormSchema,
    ) as Resolver<BoqItemFormValues>,
    defaultValues: defaultBoqItemFormValues(),
  });

  const item = itemQuery.data;
  const allowed = item
    ? resolveBoqItemActions(item, caps, versionQuery.data)
    : isCreate && canManage
      ? (['edit'] as const)
      : [];
  const editable = allowed.includes('edit');

  useEffect(() => {
    if (!item || isCreate) return;
    methods.reset({
      versionId: item.versionId,
      blockId: item.blockId,
      floorId: item.floorId,
      workCategoryId: item.workCategoryId,
      boqCode: item.boqCode,
      description: item.description,
      unit: item.unit,
      plannedQuantity: item.plannedQuantity,
      materialCost: item.materialCost,
      labourCost: item.labourCost,
      subcontractCost: item.subcontractCost,
      otherCost: item.otherCost,
      plannedRate: item.plannedRate,
      plannedValue: item.plannedValue,
      startDate: item.startDate
        ? item.startDate.slice(0, 10)
        : null,
      endDate: item.endDate ? item.endDate.slice(0, 10) : null,
      status: item.status,
      notes: item.notes ?? '',
    });
  }, [item, isCreate, methods]);

  const fieldErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(methods.formState.errors).map(([path, err]) => [
          path,
          err?.message ? String(err.message) : 'Invalid',
        ]),
      ),
    [methods.formState.errors],
  );

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="BOQ item"
        message="Requires boq.view. Create/update also need boq.manage (not boq.create/update)."
      />
    );
  }

  if (!projectReady) {
    return (
      <EmptyState
        title="Select a project"
        description="BOQ items are project-scoped. Choose an active project in the header."
      />
    );
  }

  if (!isCreate && itemQuery.isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Stack>
    );
  }

  if (!isCreate && itemQuery.isError) {
    if (isForbiddenError(itemQuery.error)) {
      return (
        <PermissionDenied
          title="BOQ item"
          message={getErrorMessage(itemQuery.error)}
        />
      );
    }
    return (
      <RetryPanel
        error={itemQuery.error}
        onRetry={() => void itemQuery.refetch()}
        forceRetry
      />
    );
  }

  if (!isCreate && !item) {
    return (
      <EmptyState
        title="BOQ item not found"
        description="The item may have been removed or belongs to another project."
        actionLabel="Back to BOQ"
        onAction={() => navigate(BOQ_ROUTES.list)}
      />
    );
  }

  if (isCreate && !canManage) {
    return (
      <PermissionDenied
        title="Create BOQ item"
        message="Requires boq.manage."
      />
    );
  }

  const onSubmit = methods.handleSubmit(async (values) => {
    if (!selectedProjectId) return;
    try {
      if (isCreate) {
        const created = await create.mutateAsync(
          shapeBoqItemCreatePayload(values),
        );
        success('Draft BOQ item created');
        navigate(BOQ_ROUTES.itemEditor(created.id), { replace: true });
        return;
      }
      if (!id) return;
      await update.mutateAsync({
        id,
        input: shapeBoqItemUpdatePayload(values),
      });
      success('BOQ item updated');
    } catch (err) {
      applyApiFieldErrors(methods.setError, err);
      notifyError(getErrorMessage(err));
    }
  });

  return (
    <Stack spacing={2}>
      <PageHeader
        title={isCreate ? 'New BOQ item' : `BOQ ${item?.boqCode ?? ''}`}
        subtitle="Maintain draft BOQ items with consistent planned value and dates."
        actions={
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to={BOQ_ROUTES.list}>
              BOQ list
            </Button>
            <Button component={RouterLink} to={BOQ_ROUTES.versions}>
              Versions
            </Button>
            {editable && (
              <Button
                variant="contained"
                onClick={() => void onSubmit()}
                disabled={create.isPending || update.isPending}
              >
                {isCreate ? 'Create draft' : 'Save'}
              </Button>
            )}
          </Stack>
        }
      />

      {!editable && !isCreate && (
        <Alert severity="warning">
          This item is not editable (immutable version or missing
          boq.manage).
        </Alert>
      )}

      {item && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <BoqItemStatusChip status={item.status} />
          <Typography variant="body2" color="text.secondary">
            Version id: {item.versionId}
          </Typography>
        </Stack>
      )}

      {(hierarchyQuery.isError || versionsQuery.isError) && (
        <RetryPanel
          error={hierarchyQuery.error ?? versionsQuery.error}
          onRetry={() => {
            void hierarchyQuery.refetch();
            void versionsQuery.refetch();
          }}
          forceRetry
        />
      )}

      <FieldErrorSummary fieldErrors={fieldErrors} />

      <FormProvider {...methods}>
        <ItemForm
          control={methods.control}
          hierarchy={hierarchyQuery.data ?? []}
          versions={versionsQuery.data ?? []}
          disabled={!editable}
          mode={isCreate ? 'create' : 'edit'}
        />
      </FormProvider>
    </Stack>
  );
}
