import { useMemo, useState } from 'react';
import { Alert, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { BillForm } from '@/running-bills/BillForm';
import { resolveRunningBillCapabilities } from '@/running-bills/roleAccess';
import {
  defaultRunningBillFormValues,
  isDuplicateMeasurementMessage,
  runningBillFormSchema,
  shapeCreatePayload,
  type RunningBillFormValues,
} from '@/running-bills/validation';
import {
  useActiveAgreements,
  useBilledMeasurementIds,
  useContractorOptions,
  useCreateRunningBill,
  useEligibleMeasurements,
  useSubmitRunningBillClaim,
} from '@/running-bills/useRunningBills';

/**
 * Create contractor RA claim — `/contractors/running-bills/new` (Micro Phase 094).
 *
 * Nest: `POST /contractor-bills` · `POST …/submit-claim`
 * Eligible measurements: `GET /work-measurements?status=verified`
 * Permissions: `running_bill.create` (submit uses same Nest code)
 */
export function RunningBillCreatePage() {
  const { hasPermission, access } = useAuth();
  const navigate = useNavigate();
  const caps = resolveRunningBillCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [values, setValues] = useState<RunningBillFormValues>(() =>
    defaultRunningBillFormValues({ projectId: selectedProjectId ?? '' }),
  );
  const [formError, setFormError] = useState<string | null>(null);

  const canCreate = Boolean(access) && caps.canCreate;
  const projectId = selectedProjectId ?? values.projectId;

  const create = useCreateRunningBill();
  const submit = useSubmitRunningBillClaim();

  const contractors = useContractorOptions(
    '',
    canCreate && caps.canViewContractors,
  );
  const agreements = useActiveAgreements(
    projectId,
    values.contractorId || null,
    canCreate && caps.canViewAgreements && Boolean(values.contractorId),
  );
  const eligible = useEligibleMeasurements(
    projectId &&
      values.contractorId &&
      values.billingPeriodFrom &&
      values.billingPeriodTo
      ? {
          projectId,
          contractorId: values.contractorId,
          fromDate: values.billingPeriodFrom,
          toDate: values.billingPeriodTo,
        }
      : null,
    canCreate && caps.canViewMeasurements,
  );
  const billedIds = useBilledMeasurementIds(
    projectId,
    values.contractorId || null,
    canCreate,
  );

  const busy = create.isPending || submit.isPending;

  const formValues = useMemo(
    () => ({
      ...values,
      projectId: projectId || values.projectId,
    }),
    [values, projectId],
  );

  const persist = async (andSubmit: boolean) => {
    setFormError(null);
    const parsed = runningBillFormSchema.safeParse(formValues);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setFormError(first?.message ?? 'Fix form errors before saving');
      return;
    }
    try {
      const bill = await create.mutateAsync(shapeCreatePayload(parsed.data));
      if (andSubmit) {
        if (!parsed.data.invoiceDocument?.trim()) {
          setFormError('Invoice document is required before submit-claim');
          navigate(`/contractors/running-bills/${encodeURIComponent(bill.id)}`);
          return;
        }
        await submit.mutateAsync(bill.id);
        success('Running bill claim submitted');
      } else {
        success('Running bill draft saved');
      }
      navigate(`/contractors/running-bills/${encodeURIComponent(bill.id)}`);
    } catch (err) {
      const message = getErrorMessage(err);
      if (isDuplicateMeasurementMessage(message)) {
        setFormError(message);
      } else {
        notifyError(message);
        setFormError(message);
      }
    }
  };

  if (access && !caps.canCreate) {
    return (
      <PermissionDenied
        title="Cannot create running bill"
        message="You need the running_bill.create permission."
      />
    );
  }

  if (!projectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose an active project before creating a contractor claim."
      />
    );
  }

  if (contractors.isError && isForbiddenError(contractors.error)) {
    return (
      <PermissionDenied
        error={contractors.error}
        title="Contractors denied"
        message="Contractor picker requires contractor.view."
      />
    );
  }

  if (contractors.isError) {
    return (
      <RetryPanel
        error={contractors.error}
        onRetry={() => void contractors.refetch()}
        title="Could not load contractors"
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="running-bill-create-page">
      <div>
        <Typography variant="h5">New running bill</Typography>
        <Typography variant="body2" color="text.secondary">
          Create a contractor claim from verified measurements in the billing
          period. Duplicate measurement claims are blocked.
        </Typography>
      </div>

      {!caps.canViewMeasurements ? (
        <Alert severity="warning">
          measurement.view is required to load eligible measurements.
        </Alert>
      ) : null}
      {!caps.canViewAgreements ? (
        <Alert severity="warning">
          contractor_agreement.view is required to select an active agreement.
        </Alert>
      ) : null}

      <BillForm
        values={formValues}
        onChange={setValues}
        contractors={contractors.data ?? []}
        agreements={agreements.data ?? []}
        measurements={eligible.data ?? []}
        billedIds={billedIds.data}
        measurementsLoading={eligible.isLoading}
        agreementsLoading={agreements.isLoading}
        busy={busy}
        formError={formError}
        canSubmit={caps.canSubmit}
        onSaveDraft={() => void persist(false)}
        onSaveAndSubmit={() => void persist(true)}
      />
    </Stack>
  );
}
