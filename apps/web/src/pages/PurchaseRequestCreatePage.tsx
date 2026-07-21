import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  Controller,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  applyApiFieldErrors,
  DateInput,
  FormSection,
  FormTextField,
} from '@/components/forms';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { useSitesList } from '@/employee-admin/useEmployees';
import { ItemsGrid } from '@/purchase-requests/ItemsGrid';
import { PRIORITY_OPTIONS } from '@/purchase-requests/labels';
import { resolvePurchaseRequestCapabilities } from '@/purchase-requests/roleAccess';
import {
  useCreatePurchaseRequest,
  useSubmitPurchaseRequest,
} from '@/purchase-requests/usePurchaseRequests';
import {
  defaultPurchaseRequestValues,
  purchaseRequestFormSchema,
  shapeCreatePayload,
  type PurchaseRequestFormValues,
} from '@/purchase-requests/validation';

/**
 * Purchase request create — `/procurement/purchase-requests/new`
 * (Micro Phase 061).
 *
 * Nest: `POST /purchase-requests` + optional `POST …/submit`
 * Permissions: `purchase.request` (+ `material.view` for picker;
 * `stock.view` / `boq.view` for stock preview & BOQ selector).
 */
export function PurchaseRequestCreatePage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const { selectedProjectId, selectedProject } = useProject();
  const { success, error: notifyError } = useNotify();
  const caps = resolvePurchaseRequestCapabilities(hasPermission);

  const create = useCreatePurchaseRequest();
  const submit = useSubmitPurchaseRequest();
  const canViewSites = hasPermission('site.view');
  const sitesQuery = useSitesList(
    { projectId: selectedProjectId ?? undefined, page: 1, limit: 100 },
    Boolean(selectedProjectId) && canViewSites,
  );
  const siteOptions = useMemo(
    () => sitesQuery.data?.items ?? [],
    [sitesQuery.data?.items],
  );

  const { control, handleSubmit, setError, setValue } =
    useForm<PurchaseRequestFormValues>({
      resolver: zodResolver(purchaseRequestFormSchema),
      defaultValues: defaultPurchaseRequestValues({
        projectId: selectedProjectId ?? '',
      }),
      mode: 'onBlur',
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    if (selectedProjectId) {
      setValue('projectId', selectedProjectId);
    }
  }, [selectedProjectId, setValue]);

  if (access && !caps.canRequest) {
    return (
      <PermissionDenied
        title="Cannot create purchase request"
        message="You need purchase.request to create purchase requests."
      />
    );
  }

  if (access && caps.canRequest && !caps.canViewMaterials) {
    return (
      <PermissionDenied
        title="Materials unavailable"
        message="Selecting materials requires material.view in addition to purchase.request."
        showHomeLink={false}
      />
    );
  }

  if (access && !selectedProjectId) {
    return (
      <PermissionDenied
        title="Project required"
        message="Select an active project in the header before creating a purchase request."
        showHomeLink={false}
      />
    );
  }

  const busy = create.isPending || submit.isPending;
  const projectLabel = selectedProject
    ? selectedProject.projectCode
      ? `${selectedProject.projectCode} · ${selectedProject.projectName}`
      : selectedProject.projectName
    : selectedProjectId;

  const persist = async (
    values: PurchaseRequestFormValues,
    thenSubmit: boolean,
  ) => {
    try {
      const created = await create.mutateAsync(shapeCreatePayload(values));
      if (thenSubmit) {
        await submit.mutateAsync(created.id);
        success(`Request ${created.requestNumber} submitted for review`);
      } else {
        success(`Draft ${created.requestNumber} saved`);
      }
      navigate(`/procurement/purchase-requests/${created.id}`);
    } catch (err) {
      if (isForbiddenError(err)) {
        notifyError(getErrorMessage(err));
        return;
      }
      applyApiFieldErrors(setError, err);
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Stack
      component="form"
      spacing={2.5}
      data-testid="purchase-request-create-page"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit((values) => persist(values, false))();
      }}
    >
      <Typography color="text.secondary">
        Create an itemised purchase request for {projectLabel}. Quantities must
        be positive and a required-by date is mandatory.
      </Typography>

      <Alert severity="info" variant="outlined">
        Nest snapshots current stock and material reorder levels on create and
        refresh on submit. Client stock warnings are a preview only.
      </Alert>

      <FormSection title="Request details">
        <DateInput
          name="requiredByDate"
          control={control}
          label="Required by"
          required
        />
        <Controller
          name="priority"
          control={control}
          render={({ field, fieldState }) => (
            <FormControl
              size="small"
              fullWidth
              disabled={busy}
              error={Boolean(fieldState.error)}
              required
            >
              <InputLabel id="pr-priority">Priority</InputLabel>
              <Select {...field} labelId="pr-priority" label="Priority">
                {PRIORITY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
        {canViewSites ? (
          <>
            <Controller
              name="siteId"
              control={control}
              render={({ field }) => (
                <FormControl size="small" fullWidth disabled={busy}>
                  <InputLabel id="pr-site">Requesting site</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ''}
                    labelId="pr-site"
                    label="Requesting site"
                    data-testid="pr-site-select"
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {siteOptions.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.siteCode} · {site.siteName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="warehouseSiteId"
              control={control}
              render={({ field }) => (
                <FormControl size="small" fullWidth disabled={busy}>
                  <InputLabel id="pr-warehouse">Warehouse site (optional)</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ''}
                    labelId="pr-warehouse"
                    label="Warehouse site (optional)"
                    data-testid="pr-warehouse-select"
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {siteOptions.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.siteCode} · {site.siteName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </>
        ) : null}
      </FormSection>

      <ItemsGrid
        control={control}
        setValue={setValue}
        fields={fields}
        append={append}
        remove={remove}
        projectId={selectedProjectId}
        canViewStock={caps.canViewStock}
        canViewBoq={caps.canViewBoq}
        disabled={busy}
      />

      <FormSection title="Justification">
        <FormTextField
          name="justification"
          control={control}
          label="Justification"
          required
          multiline
          minRows={3}
          disabled={busy}
        />
      </FormSection>

      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
        <Button
          type="button"
          onClick={() => navigate('/procurement/purchase-requests')}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button type="submit" variant="outlined" disabled={busy}>
          {create.isPending && !submit.isPending ? 'Saving…' : 'Save draft'}
        </Button>
        <Button
          type="button"
          variant="contained"
          disabled={busy}
          onClick={() => {
            void handleSubmit((values) => persist(values, true))();
          }}
        >
          {submit.isPending ? 'Submitting…' : 'Save & submit'}
        </Button>
      </Stack>
    </Stack>
  );
}
