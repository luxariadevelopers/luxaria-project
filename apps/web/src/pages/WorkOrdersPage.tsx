import { useMemo, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import { CancelWorkOrderDialog } from '@/work-orders/CancelWorkOrderDialog';
import { PageHeader } from '@/layouts/PageHeader';
import {
  WorkOrderFilters,
  type WorkOrderFilterState,
} from '@/work-orders/WorkOrderFilters';
import {
  WorkOrderFormDrawer,
  type WorkOrderEntryMode,
} from '@/work-orders/WorkOrderFormDrawer';
import { WorkOrderTable } from '@/work-orders/WorkOrderTable';
import { resolveWorkOrderCapabilities } from '@/work-orders/roleAccess';
import type { PublicWorkOrder, WorkOrderStatus } from '@/work-orders/types';
import {
  useApproveWorkOrder,
  useContractorOptions,
  useIssueWorkOrder,
  useSubmitWorkOrder,
  useWorkOrdersList,
} from '@/work-orders/useWorkOrders';

/**
 * Work orders list — `/work-orders`.
 * Permissions: `work_order.view|create|approve|issue|close`.
 */
export function WorkOrdersPage() {
  const navigate = useNavigate();
  const { hasPermission, access } = useAuth();
  const caps = resolveWorkOrderCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const { success, error: notifyError } = useNotify();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<WorkOrderFilterState>({
    status: '',
    contractorId: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<WorkOrderEntryMode>('create');
  const [activeRow, setActiveRow] = useState<PublicWorkOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PublicWorkOrder | null>(
    null,
  );

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      contractorId: filters.contractorId || undefined,
      status: (filters.status || undefined) as WorkOrderStatus | undefined,
    }),
    [page, pageSize, selectedProjectId, filters.contractorId, filters.status],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useWorkOrdersList(listQuery, enabled);
  const contractors = useContractorOptions('', enabled);
  const submit = useSubmitWorkOrder();
  const approve = useApproveWorkOrder();
  const issue = useIssueWorkOrder();

  const contractorLabel = (contractorId: string) => {
    const match = contractors.data?.find((c) => c.id === contractorId);
    return match?.label ?? contractorId.slice(-6);
  };

  const openDrawer = (
    mode: WorkOrderEntryMode,
    row: PublicWorkOrder | null = null,
  ) => {
    setDrawerMode(mode);
    setActiveRow(row);
    setDrawerOpen(true);
  };

  if (access && !caps.canView) {
    return <PermissionDenied message="Missing permission work_order.view" />;
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Work orders are project-scoped. Choose an active project to continue."
      />
    );
  }

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Contractor work orders with immutable commercial revisions. Amendments never overwrite an approved snapshot silently."
      />

      <WorkOrderTable
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        search={search}
        onSearchChange={setSearch}
        filterSlot={
          <WorkOrderFilters
            value={filters}
            onChange={setFilters}
            contractorOptions={contractors.data ?? []}
          />
        }
        toolbarActions={
          caps.canCreate ? (
            <Button variant="contained" onClick={() => openDrawer('create')}>
              New work order
            </Button>
          ) : null
        }
        caps={caps}
        contractorLabel={contractorLabel}
        onOpenDetail={(row) => navigate(`/work-orders/${row.id}`)}
        onEdit={(row) => openDrawer('edit', row)}
        onSubmit={async (row) => {
          try {
            await submit.mutateAsync(row.id);
            success('Work order submitted for approval');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onApprove={async (row) => {
          try {
            await approve.mutateAsync(row.id);
            success('Work order approved (r1 frozen)');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onIssue={async (row) => {
          try {
            await issue.mutateAsync(row.id);
            success('Work order issued');
          } catch (err) {
            notifyError(getErrorMessage(err));
          }
        }}
        onCancel={(row) => setCancelTarget(row)}
      />

      <WorkOrderFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        projectId={selectedProjectId}
        workOrder={activeRow}
        canCreate={caps.canCreate}
        onSaved={(row) => navigate(`/work-orders/${row.id}`)}
      />

      <CancelWorkOrderDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        workOrder={cancelTarget}
      />
    </Stack>
  );
}
