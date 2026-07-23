import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { listSiteSafety, type SiteSafety } from '@/site-safety/api';
import { SiteSafetyFormDrawer } from '@/site-safety/SiteSafetyFormDrawer';

function canEditSafety(row: SiteSafety): boolean {
  return row.status !== 'closed';
}

export function SiteSafetyPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('safety.view');
  const canManage = hasPermission('safety.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<SiteSafety | null>(null);

  const query = useQuery({
    queryKey: ['site-safety', selectedProjectId],
    queryFn: () => listSiteSafety(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: SiteSafety) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  const columns = useMemo<GridColDef<SiteSafety>[]>(
    () => [
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 150,
        valueGetter: (_v, row) => row.type.replaceAll('_', ' '),
      },
      {
        field: 'severity',
        headerName: 'Severity',
        width: 120,
        renderCell: (params) => (
          <Chip size="small" label={params.row.severity} />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip size="small" label={params.row.status} />
        ),
      },
      {
        field: 'attendees',
        headerName: 'Attendees',
        width: 110,
        type: 'number',
        valueGetter: (_v, row) => row.attendees?.length ?? 0,
      },
    ],
    [],
  );

  const rowActions = useMemo<DataTableRowAction<SiteSafety>[]>(() => {
    if (!canManage) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        onClick: openEdit,
        disabled: (row) => !canEditSafety(row),
      },
    ];
  }, [canManage]);

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view site safety.</Alert>
    );
  }
  if (query.isError) {
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => void query.refetch()}
        forceRetry
      />
    );
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Near misses, accidents, PPE checks, toolbox talks, and safety inspections."
        actions={
          canManage ? (
            <Button variant="contained" onClick={openCreate}>
              New record
            </Button>
          ) : undefined
        }
      />
      <DataTable
        title="Site safety"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No safety records"
        emptyDescription="No safety records yet."
        height={520}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'title',
          metaFields: ['type', 'severity'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      {canManage ? (
        <SiteSafetyFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          record={editTarget}
        />
      ) : null}
    </Stack>
  );
}
