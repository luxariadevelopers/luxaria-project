import { useMemo, useState } from 'react';
import { Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import type { PublicMeasurementBookEntry } from '@/measurement-book/api';
import { MeasurementBookFormDrawer } from '@/measurement-book/MeasurementBookFormDrawer';
import { RejectMbDialog } from '@/measurement-book/RejectMbDialog';
import { ReviseMbDialog } from '@/measurement-book/ReviseMbDialog';
import { resolveMeasurementBookCapabilities } from '@/measurement-book/roleAccess';
import {
  useAcknowledgeMeasurementBook,
  useCancelMeasurementBook,
  useCertifyMeasurementBook,
  useMeasurementBookList,
  useRejectMeasurementBook,
  useReviseMeasurementBook,
  useSubmitMeasurementBook,
  useVerifyMeasurementBook,
} from '@/measurement-book/useMeasurementBook';
import { resolveMeasurementBookActions } from '@/measurement-book/workflowActions';

function formatDims(row: {
  length: number | null;
  breadth: number | null;
  height: number | null;
  numberOfUnits: number;
}): string {
  const parts = [
    row.numberOfUnits != null ? `${row.numberOfUnits} nos` : null,
    row.length != null ? `L ${row.length}` : null,
    row.breadth != null ? `B ${row.breadth}` : null,
    row.height != null ? `H ${row.height}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' × ') : '—';
}

/**
 * Measurement Book register — create / submit / certify.
 * Nest: `GET|POST /measurement-book` + workflow actions.
 */
export function MeasurementBookPage() {
  const { hasPermission, access, user } = useAuth();
  const caps = resolveMeasurementBookCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] =
    useState<PublicMeasurementBookEntry | null>(null);
  const [reviseTarget, setReviseTarget] =
    useState<PublicMeasurementBookEntry | null>(null);

  const list = useMeasurementBookList(
    { projectId: selectedProjectId! },
    caps.canView && Boolean(selectedProjectId),
  );
  const submit = useSubmitMeasurementBook();
  const acknowledge = useAcknowledgeMeasurementBook();
  const verify = useVerifyMeasurementBook();
  const certify = useCertifyMeasurementBook();
  const reject = useRejectMeasurementBook();
  const cancel = useCancelMeasurementBook();
  const revise = useReviseMeasurementBook();

  const run = (action: () => Promise<unknown>, okMessage: string) => {
    void (async () => {
      try {
        await action();
        success(okMessage);
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const columns = useMemo<GridColDef<PublicMeasurementBookEntry>[]>(
    () => [
      {
        field: 'entryNumber',
        headerName: 'Entry',
        width: 140,
      },
      {
        field: 'revision',
        headerName: 'Rev',
        width: 70,
      },
      {
        field: 'period',
        headerName: 'Period',
        width: 200,
        valueGetter: (_v, row) =>
          `${row.periodFrom.slice(0, 10)} → ${row.periodTo.slice(0, 10)}`,
      },
      {
        field: 'boq',
        headerName: 'BOQ',
        width: 120,
        valueGetter: (_v, row) => row.boqCode || row.boqItemId.slice(-6),
      },
      {
        field: 'location',
        headerName: 'Location',
        flex: 1,
        minWidth: 120,
        valueGetter: (_v, row) => row.location.locationLabel || '—',
      },
      {
        field: 'dims',
        headerName: 'Dims',
        width: 160,
        valueGetter: (_v, row) => formatDims(row),
      },
      {
        field: 'quantity',
        headerName: 'Qty',
        width: 110,
        valueGetter: (_v, row) => `${row.quantity} ${row.unit}`,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => (
          <Chip size="small" label={params.row.status} />
        ),
      },
    ],
    [],
  );

  const rowActions = (
    row: PublicMeasurementBookEntry,
  ): DataTableRowAction<PublicMeasurementBookEntry>[] => {
    const actions = resolveMeasurementBookActions(row, caps, user?.id);
    const items: DataTableRowAction<PublicMeasurementBookEntry>[] = [];

    if (actions.includes('submit')) {
      items.push({
        id: 'submit',
        label: 'Submit',
        onClick: (r) =>
          run(() => submit.mutateAsync(r.id), 'Entry submitted'),
      });
    }
    if (actions.includes('acknowledge')) {
      items.push({
        id: 'acknowledge',
        label: 'Acknowledge',
        onClick: (r) =>
          run(() => acknowledge.mutateAsync(r.id), 'Entry acknowledged'),
      });
    }
    if (actions.includes('verify')) {
      items.push({
        id: 'verify',
        label: 'Verify',
        onClick: (r) =>
          run(() => verify.mutateAsync(r.id), 'Entry verified'),
      });
    }
    if (actions.includes('certify')) {
      items.push({
        id: 'certify',
        label: 'Certify',
        onClick: (r) =>
          run(() => certify.mutateAsync(r.id), 'Entry certified'),
      });
    }
    if (actions.includes('reject')) {
      items.push({
        id: 'reject',
        label: 'Reject',
        danger: true,
        onClick: (r) => setRejectTarget(r),
      });
    }
    if (actions.includes('cancel')) {
      items.push({
        id: 'cancel',
        label: 'Cancel',
        onClick: (r) =>
          run(() => cancel.mutateAsync(r.id), 'Entry cancelled'),
      });
    }
    if (actions.includes('revise')) {
      items.push({
        id: 'revise',
        label: 'Revise',
        onClick: (r) => setReviseTarget(r),
      });
    }

    return items;
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Measurement book unavailable"
        message="You need the measurement.view permission."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Measurement book entries are project-scoped."
      />
    );
  }

  if (list.isError) {
    return (
      <RetryPanel error={list.error} onRetry={() => void list.refetch()} />
    );
  }

  const rows = list.data ?? [];

  return (
    <Stack spacing={2} data-testid="measurement-book-page">
      <PageHeader
        subtitle="Formal MB register — L/B/H quantities, engineer submit, contractor acknowledgement, verify/certify (`measurement.create` / `measurement.certify`)."
        actions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              New entry
            </Button>
          ) : undefined
        }
      />

      <DataTable
        title="Measurement book"
        rows={rows}
        columns={columns}
        loading={list.isLoading || list.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No measurement book entries"
        emptyDescription="No measurement book entries for this project."
        height={560}
        paginationMode="client"
        rowActions={rowActions}
        mobileCard={{
          primaryField: 'entryNumber',
          metaFields: ['period', 'quantity'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      <MeasurementBookFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        canCreate={caps.canCreate}
        canViewBoq={caps.canViewBoq}
        canViewContractors={caps.canViewContractors}
      />

      <RejectMbDialog
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        loading={reject.isPending}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          run(
            () => reject.mutateAsync({ id: rejectTarget.id, reason }),
            'Entry rejected',
          );
          setRejectTarget(null);
        }}
      />

      <ReviseMbDialog
        open={Boolean(reviseTarget)}
        onClose={() => setReviseTarget(null)}
        entry={reviseTarget}
        loading={revise.isPending}
        onConfirm={(input) => {
          if (!reviseTarget) return;
          run(
            () => revise.mutateAsync({ id: reviseTarget.id, input }),
            'Revision draft created',
          );
          setReviseTarget(null);
        }}
      />
    </Stack>
  );
}
