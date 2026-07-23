import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Chip, Stack } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, type DataTableRowAction } from '@/components/DataTable';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/layouts/PageHeader';
import { listEquipment, type Equipment } from '@/equipment/api';
import { EquipmentFormDrawer } from '@/equipment/EquipmentFormDrawer';

export function EquipmentPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('equipment.view');
  const canManage = hasPermission('equipment.manage');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Equipment | null>(null);

  const query = useQuery({
    queryKey: ['equipment', selectedProjectId],
    queryFn: () => listEquipment(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: Equipment) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  const columns = useMemo<GridColDef<Equipment>[]>(
    () => [
      {
        field: 'code',
        headerName: 'Code',
        width: 130,
      },
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 140,
        valueGetter: (_v, row) => row.type || '—',
      },
      {
        field: 'ownership',
        headerName: 'Ownership',
        width: 120,
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

  const rowActions = useMemo<DataTableRowAction<Equipment>[]>(() => {
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
    return <Alert severity="info">Select a project to view equipment.</Alert>;
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
        subtitle="Master register with allocation, fuel, maintenance, breakdown, and DPR utilization. Enable via project setting equipmentEnabled before logging utilization."
        actions={
          canManage ? (
            <Button variant="contained" onClick={openCreate}>
              New equipment
            </Button>
          ) : undefined
        }
      />
      <DataTable
        title="Equipment"
        rows={rows}
        columns={columns}
        loading={query.isLoading || query.isFetching}
        getRowId={(row) => row.id}
        emptyTitle="No equipment"
        emptyDescription="No equipment yet."
        height={520}
        paginationMode="client"
        rowActions={rowActions.length > 0 ? rowActions : undefined}
        mobileCard={{
          primaryField: 'code',
          metaFields: ['name', 'ownership'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      {canManage ? (
        <EquipmentFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          mode={drawerMode}
          projectId={selectedProjectId}
          equipment={editTarget}
        />
      ) : null}
    </Stack>
  );
}
