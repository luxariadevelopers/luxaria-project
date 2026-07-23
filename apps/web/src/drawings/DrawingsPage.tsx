import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { listDrawings, type Drawing } from '@/drawings/api';

export function DrawingsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('drawing.view');

  const query = useQuery({
    queryKey: ['drawings', selectedProjectId],
    queryFn: () =>
      listDrawings({
        projectId: selectedProjectId!,
        isLatest: true,
      }),
    enabled: canView && Boolean(selectedProjectId),
  });

  const columns = useMemo<GridColDef<Drawing>[]>(
    () => [
      {
        field: 'drawingNumber',
        headerName: 'Drawing #',
        width: 140,
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 180,
      },
      {
        field: 'discipline',
        headerName: 'Discipline',
        width: 140,
        valueGetter: (_v, row) => row.discipline || '—',
      },
      {
        field: 'revision',
        headerName: 'Rev',
        width: 80,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params) => (
          <Chip size="small" label={params.row.status} />
        ),
      },
    ],
    [],
  );

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return <Alert severity="info">Select a project to view drawings.</Alert>;
  }
  if (query.isError) {
    return (
      <RetryPanel error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <PageHeader
        subtitle="Latest revisions only. Upload a new revision to supersede the previous issue. Files are stored via the documents module."
      />
      <DataTable
        title="Drawings"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No drawings"
        emptyDescription="No drawings yet."
        height={520}
        paginationMode="client"
        mobileCard={{
          primaryField: 'drawingNumber',
          metaFields: ['title', 'revision'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />
    </Stack>
  );
}
