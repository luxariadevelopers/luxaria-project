import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  MeasurementFilters,
} from '@/work-measurements/MeasurementFilters';
import { MeasurementForm } from '@/work-measurements/MeasurementForm';
import { MeasurementTable } from '@/work-measurements/MeasurementTable';
import { RejectMeasurementDialog } from '@/work-measurements/RejectMeasurementDialog';
import { resolveWorkMeasurementCapabilities } from '@/work-measurements/roleAccess';
import type {
  PublicWorkMeasurement,
  WorkMeasurementFilterState,
  WorkMeasurementStatus,
} from '@/work-measurements/types';
import { emptyWorkMeasurementFilters } from '@/work-measurements/validation';
import {
  useCancelWorkMeasurement,
  useCertifyWorkMeasurement,
  useRejectWorkMeasurement,
  useSubmitWorkMeasurement,
  useVerifyWorkMeasurement,
  useWorkMeasurementsList,
} from '@/work-measurements/useWorkMeasurements';

/**
 * Work measurements list — `/project-control/work-measurements` (Micro Phase 081).
 *
 * Nest: `GET /work-measurements` (`measurement.view`).
 * Create/update/submit/cancel: `measurement.create`.
 * Verify/certify/reject: `measurement.certify`.
 */
export function WorkMeasurementsPage() {
  const { hasPermission, access, user } = useAuth();
  const caps = resolveWorkMeasurementCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<WorkMeasurementFilterState>(
    emptyWorkMeasurementFilters(),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] =
    useState<PublicWorkMeasurement | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<PublicWorkMeasurement | null>(null);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      status: (filters.status || undefined) as WorkMeasurementStatus | undefined,
      contractorId: filters.contractorId.trim() || undefined,
      boqItemId: filters.boqItemId.trim() || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
    }),
    [page, pageSize, selectedProjectId, filters],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useWorkMeasurementsList(listQuery, enabled);
  const submit = useSubmitWorkMeasurement();
  const verify = useVerifyWorkMeasurement();
  const certify = useCertifyWorkMeasurement();
  const reject = useRejectWorkMeasurement();
  const cancel = useCancelWorkMeasurement();

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Work measurements unavailable"
        message="You need the measurement.view permission to review work measurements."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to list work measurements."
      />
    );
  }

  const run = (
    action: () => Promise<unknown>,
    okMessage: string,
  ) => {
    void (async () => {
      try {
        await action();
        success(okMessage);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const formOpen = createOpen || Boolean(editTarget);

  return (
    <Stack spacing={2} data-testid="work-measurements-page">
      <PageHeader
        subtitle="Record and verify completed quantities against active BOQ items. Engineer verification requires measurement.certify and a different user than measuredBy."
      />

      <MeasurementTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? list.data?.items.length ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterSlot={
          <MeasurementFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        toolbarActions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New measurement
            </Button>
          ) : undefined
        }
        caps={caps}
        currentUserId={user?.id}
        onOpen={setEditTarget}
        onEdit={setEditTarget}
        onSubmit={(row) =>
          run(
            () => submit.mutateAsync(row.id),
            'Work measurement submitted for verification',
          )
        }
        onVerify={(row) =>
          run(
            () => verify.mutateAsync({ id: row.id }),
            'Work measurement verified',
          )
        }
        onCertify={(row) =>
          run(
            () => certify.mutateAsync({ id: row.id }),
            'Work measurement certified; BOQ progress updated',
          )
        }
        onReject={setRejectTarget}
        onCancel={(row) =>
          run(
            () => cancel.mutateAsync(row.id),
            'Work measurement cancelled',
          )
        }
      />

      <MeasurementForm
        open={formOpen}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
        projectId={selectedProjectId}
        measurement={editTarget}
        canViewBoq={caps.canViewBoq}
        canViewContractors={caps.canViewContractors}
        onSaved={() => void list.refetch()}
      />

      <RejectMeasurementDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        loading={reject.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          run(async () => {
            await reject.mutateAsync({
              id: rejectTarget.id,
              input: { reason },
            });
            setRejectTarget(null);
          }, 'Work measurement rejected');
        }}
      />
    </Stack>
  );
}
