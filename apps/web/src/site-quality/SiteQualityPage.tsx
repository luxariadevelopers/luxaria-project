import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { listSiteQuality, type SiteQuality } from '@/site-quality/api';
import { SiteQualityFormDrawer } from '@/site-quality/SiteQualityFormDrawer';

function canEditQuality(row: SiteQuality): boolean {
  return row.status !== 'closed' && row.status !== 'cancelled';
}

export function SiteQualityPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_quality.view');
  const canManage = hasPermission('site_quality.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<SiteQuality | null>(null);

  const query = useQuery({
    queryKey: ['site-quality', selectedProjectId],
    queryFn: () => listSiteQuality(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: SiteQuality) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  const columns = useMemo<GridColDef<SiteQuality>[]>(
    () => [
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'ncrNumber',
        headerName: 'NCR #',
        width: 120,
        valueGetter: (_v, row) => row.ncrNumber || '—',
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
        field: 'findings',
        headerName: 'Findings',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) => {
          if (!row.findings) return '—';
          return row.findings.length > 60
            ? `${row.findings.slice(0, 60)}…`
            : row.findings;
        },
      },
      {
        field: 'punchItems',
        headerName: 'Punch items',
        width: 120,
        type: 'number',
        valueGetter: (_v, row) => row.punchItems?.length ?? 0,
      },
    ],
    [],
  );

  const rowActions = useMemo<DataTableRowAction<SiteQuality>[]>(() => {
    if (!canManage) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        onClick: openEdit,
        disabled: (row) => !canEditQuality(row),
      },
    ];
  }, [canManage]);

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view site quality.</Alert>
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
        subtitle="Workmanship inspections, NCRs, punch lists, and re-inspections. Separate from GRN / vendor quality inspections."
        actions={
          canManage ? (
            <Button variant="contained" onClick={openCreate}>
              New inspection
            </Button>
          ) : undefined
        }
      />
      <DataTable
        title="Site quality"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No site quality records"
        emptyDescription="No site quality records yet."
        height={520}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'title',
          metaFields: ['ncrNumber', 'punchItems'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      {canManage ? (
        <SiteQualityFormDrawer
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
