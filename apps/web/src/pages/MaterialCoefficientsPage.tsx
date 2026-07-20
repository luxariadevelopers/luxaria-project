import { useMemo, useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { ApproveCoefficientDialog } from '@/material-coefficients/ApproveCoefficientDialog';
import { CoefficientTable } from '@/material-coefficients/CoefficientTable';
import {
  MaterialCoefficientFilters,
  type MaterialCoefficientFilterState,
} from '@/material-coefficients/MaterialCoefficientFilters';
import {
  MaterialCoefficientForm,
  shapeCoefficientCreatePayload,
} from '@/material-coefficients/MaterialCoefficientForm';
import { RejectCoefficientDialog } from '@/material-coefficients/RejectCoefficientDialog';
import { resolveMaterialCoefficientCapabilities } from '@/material-coefficients/roleAccess';
import type { PublicMaterialCoefficient } from '@/material-coefficients/types';
import {
  useApproveMaterialCoefficient,
  useCreateMaterialCoefficient,
  useCreateMaterialCoefficientVersion,
  useMaterialCoefficientsList,
  useRejectMaterialCoefficient,
  useSubmitMaterialCoefficient,
  useUpdateMaterialCoefficient,
} from '@/material-coefficients/useMaterialCoefficients';
import {
  validateVersionCreateAgainstExisting,
  type ApproveCoefficientFormValues,
  type CoefficientFormValues,
  type RejectCoefficientFormValues,
} from '@/material-coefficients/validation';

/**
 * Material consumption standards (Micro Phase 084).
 * Route: `/project-control/material-coefficients`
 */
export function MaterialCoefficientsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialCoefficientCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [filters, setFilters] = useState<MaterialCoefficientFilterState>({
    scopeMode: selectedProjectId ? 'project' : 'global',
    status: '',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PublicMaterialCoefficient | null>(null);
  const [approveTarget, setApproveTarget] =
    useState<PublicMaterialCoefficient | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<PublicMaterialCoefficient | null>(null);
  const [banner, setBanner] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );

  const listQuery = useMemo(
    () => ({
      page: 1,
      limit: 100,
      globalOnly: filters.scopeMode === 'global' ? true : undefined,
      projectId:
        filters.scopeMode === 'project' && selectedProjectId
          ? selectedProjectId
          : undefined,
      status: filters.status || undefined,
    }),
    [filters.scopeMode, filters.status, selectedProjectId],
  );

  const scopeBlocked =
    filters.scopeMode === 'project' && !selectedProjectId;

  const enabled = caps.canView && !scopeBlocked;
  const list = useMaterialCoefficientsList(listQuery, enabled);
  const rows = list.data?.items ?? [];

  const create = useCreateMaterialCoefficient();
  const update = useUpdateMaterialCoefficient();
  const createVersion = useCreateMaterialCoefficientVersion();
  const submit = useSubmitMaterialCoefficient();
  const approve = useApproveMaterialCoefficient();
  const reject = useRejectMaterialCoefficient();

  if (access && !caps.canView) {
    return (
      <Typography color="error">
        You need material_consumption.view to review consumption standards.
      </Typography>
    );
  }

  if (scopeBlocked) {
    return (
      <Typography color="text.secondary">
        Select a project in the header for project-specific standards, or switch to
        company-wide scope.
      </Typography>
    );
  }

  const notify = (severity: 'success' | 'error', text: string) => {
    setBanner({ severity, text });
  };

  const handleCreateOrUpdate = async (values: CoefficientFormValues) => {
    try {
      if (editing) {
        const payload = shapeCoefficientCreatePayload(values);
        await update.mutateAsync({ id: editing.id, input: payload });
        notify('success', 'Consumption standard updated');
      } else {
        const payload = shapeCoefficientCreatePayload(values);
        await create.mutateAsync(payload);
        notify('success', 'Consumption standard created (draft)');
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      notify('error', getErrorMessage(err));
      throw err;
    }
  };

  const handleCreateVersion = async (row: PublicMaterialCoefficient) => {
    const check = validateVersionCreateAgainstExisting(row, rows);
    if (!check.ok) {
      notify('error', check.message);
      return;
    }
    try {
      await createVersion.mutateAsync(row.id);
      notify('success', `Version ${row.version + 1} draft created`);
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleSubmit = async (row: PublicMaterialCoefficient) => {
    try {
      await submit.mutateAsync(row.id);
      notify('success', 'Submitted for approval');
    } catch (err) {
      notify('error', getErrorMessage(err));
    }
  };

  const handleApprove = async (values: ApproveCoefficientFormValues) => {
    if (!approveTarget) return;
    try {
      await approve.mutateAsync({
        id: approveTarget.id,
        input: {
          approvalReference: values.approvalReference.trim(),
          notes: values.notes?.trim() || null,
        },
      });
      notify('success', 'Consumption standard approved and activated');
      setApproveTarget(null);
    } catch (err) {
      notify('error', getErrorMessage(err));
      throw err;
    }
  };

  const handleReject = async (values: RejectCoefficientFormValues) => {
    if (!rejectTarget) return;
    try {
      await reject.mutateAsync({
        id: rejectTarget.id,
        input: { reason: values.reason.trim() },
      });
      notify('success', 'Consumption standard rejected');
      setRejectTarget(null);
    } catch (err) {
      notify('error', getErrorMessage(err));
      throw err;
    }
  };

  return (
    <Stack spacing={2} data-testid="material-coefficients-page">
      <Typography variant="h4">Consumption Standards</Typography>
      <Typography color="text.secondary">
        Standard and project-specific material consumption norms per work type or
        BOQ item. Project overrides take precedence when resolving consumption.
      </Typography>

      {banner ? (
        <Alert severity={banner.severity} onClose={() => setBanner(null)}>
          {banner.text}
        </Alert>
      ) : null}

      <CoefficientTable
        rows={rows}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        filterSlot={
          <MaterialCoefficientFilters
            value={filters}
            projectSelected={Boolean(selectedProjectId)}
            onChange={setFilters}
          />
        }
        toolbarActions={
          caps.canManage ? (
            <Button
              variant="contained"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New standard
            </Button>
          ) : undefined
        }
        caps={caps}
        onEdit={(row) => {
          setEditing(row);
          setFormOpen(true);
        }}
        onSubmit={handleSubmit}
        onApprove={setApproveTarget}
        onReject={setRejectTarget}
        onCreateVersion={handleCreateVersion}
      />

      <MaterialCoefficientForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        projectId={selectedProjectId}
        existing={rows}
        editing={editing}
        onSubmit={handleCreateOrUpdate}
        submitting={create.isPending || update.isPending}
      />

      <ApproveCoefficientDialog
        open={Boolean(approveTarget)}
        row={approveTarget}
        onClose={() => setApproveTarget(null)}
        onSubmit={handleApprove}
        submitting={approve.isPending}
      />

      <RejectCoefficientDialog
        open={Boolean(rejectTarget)}
        row={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
        submitting={reject.isPending}
      />
    </Stack>
  );
}
