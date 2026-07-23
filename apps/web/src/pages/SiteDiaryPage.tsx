import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import {
  fetchSiteDiaryEntries,
  type PublicSiteDiaryEntry,
} from '@/site-diary/api';
import { SiteDiaryFormDrawer } from '@/site-diary/SiteDiaryFormDrawer';

export function SiteDiaryPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('site_diary.view');
  const canManage = hasPermission('site_diary.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<PublicSiteDiaryEntry | null>(
    null,
  );

  const query = useQuery({
    queryKey: ['site-diary', selectedProjectId],
    queryFn: () =>
      fetchSiteDiaryEntries({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: PublicSiteDiaryEntry) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  const columns = useMemo<GridColDef<PublicSiteDiaryEntry>[]>(
    () => [
      {
        field: 'entryDate',
        headerName: 'Date',
        width: 120,
        valueGetter: (_v, row) => row.entryDate.slice(0, 10),
      },
      {
        field: 'entryType',
        headerName: 'Type',
        width: 140,
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'visitors',
        headerName: 'Visitors',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) =>
          row.visitors.length === 0
            ? '—'
            : row.visitors.map((v) => v.name).join(', '),
      },
      {
        field: 'photos',
        headerName: 'Photos',
        width: 90,
        type: 'number',
        valueGetter: (_v, row) => row.photoDocumentIds.length,
      },
    ],
    [],
  );

  const rowActions = useMemo<DataTableRowAction<PublicSiteDiaryEntry>[]>(() => {
    if (!canManage) return [];
    return [
      {
        id: 'edit',
        label: 'Edit',
        onClick: openEdit,
      },
    ];
  }, [canManage]);

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view the site diary.</Alert>
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
        subtitle="Meetings, delays, visitors, instructions, and risks linked to project / DPR."
        actions={
          canManage ? (
            <Button variant="contained" onClick={openCreate}>
              New entry
            </Button>
          ) : undefined
        }
      />
      <DataTable
        title="Site diary"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No diary entries"
        emptyDescription="No diary entries for this project."
        height={520}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'title',
          metaFields: ['entryDate', 'entryType'],
        }}
        showColumnVisibility={false}
      />

      {canManage ? (
        <SiteDiaryFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          entry={editTarget}
        />
      ) : null}
    </Stack>
  );
}
