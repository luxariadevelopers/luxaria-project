import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { fetchSiteIssues, type PublicSiteIssue } from '@/site-issues/api';
import { SiteIssueFormDrawer } from '@/site-issues/SiteIssueFormDrawer';

function statusColor(
  status: string,
): 'default' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'open':
      return 'warning';
    case 'assigned':
      return 'info';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'default';
    default:
      return 'default';
  }
}

function canEditIssue(row: PublicSiteIssue): boolean {
  return row.status === 'open' || row.status === 'assigned';
}

export function SiteIssuesPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_issue.view');
  const canCreate = hasPermission('site_issue.create');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<PublicSiteIssue | null>(null);

  const query = useQuery({
    queryKey: ['site-issues', selectedProjectId],
    queryFn: () => fetchSiteIssues({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: PublicSiteIssue) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  const columns = useMemo<GridColDef<PublicSiteIssue>[]>(
    () => [
      {
        field: 'issueNumber',
        headerName: 'Number',
        width: 140,
      },
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
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.status}
            color={statusColor(params.row.status)}
          />
        ),
      },
    ],
    [],
  );

  const rowActions = useMemo<DataTableRowAction<PublicSiteIssue>[]>(() => {
    if (!canCreate) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        onClick: openEdit,
        disabled: (row) => !canEditIssue(row),
      },
    ];
  }, [canCreate]);

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view site issues.</Alert>;
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
        subtitle="Delays, shortages, equipment failures, and design clarifications. Workflow: open → assigned → resolved → closed."
        actions={
          canCreate ? (
            <Button variant="contained" onClick={openCreate}>
              New issue
            </Button>
          ) : undefined
        }
      />
      <DataTable
        title="Site issues"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No site issues"
        emptyDescription="No site issues for this project."
        height={520}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'issueNumber',
          metaFields: ['title', 'severity'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      {canCreate ? (
        <SiteIssueFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          issue={editTarget}
        />
      ) : null}
    </Stack>
  );
}
