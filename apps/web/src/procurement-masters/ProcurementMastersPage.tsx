import { useMemo, useState } from 'react';
import { PageHeader } from '@/layouts/PageHeader';
import {
  Button,
  Chip,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { getErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable, DEFAULT_LIST_PAGE_SIZE } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { MasterFormDialog } from './MasterFormDialog';
import {
  canManageResource,
  canViewResource,
  resolveProcurementMasterCapabilities,
} from './roleAccess';
import type { MasterResource, MasterRow } from './types';
import {
  useMasterList,
  useSeedMasterDefaults,
} from './useProcurementMasters';

const TABS: Array<{ id: MasterResource; label: string }> = [
  { id: 'payment-terms', label: 'Payment terms' },
  { id: 'delivery-terms', label: 'Delivery terms' },
  { id: 'tax-rules', label: 'Tax rules' },
  { id: 'purchase-categories', label: 'Purchase categories' },
  { id: 'material-categories', label: 'Material categories' },
  { id: 'vendor-categories', label: 'Vendor categories' },
];

/**
 * Procurement masters — company catalogs (payment/delivery/tax + categories).
 *
 * Nest: `GET/POST/PATCH /procurement-masters/*`
 */
export function ProcurementMastersPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveProcurementMasterCapabilities(hasPermission);
  const { success, error: notifyError } = useNotify();
  const seed = useSeedMasterDefaults();

  const visibleTabs = useMemo(
    () =>
      TABS.filter((tab) => canViewResource(caps, tab.id, hasPermission)),
    [caps, hasPermission],
  );

  const [tab, setTab] = useState<MasterResource>(
    visibleTabs[0]?.id ?? 'payment-terms',
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<MasterRow | null>(null);

  const activeTab =
    visibleTabs.find((t) => t.id === tab)?.id ?? visibleTabs[0]?.id;
  const resource = activeTab ?? 'payment-terms';
  const canManage = canManageResource(caps, resource, hasPermission);

  const list = useMasterList(
    resource,
    { page, limit: pageSize },
    Boolean(access) && caps.canViewAny && Boolean(activeTab),
  );

  const columns = useMemo<GridColDef<MasterRow>[]>(() => {
    const cols: GridColDef<MasterRow>[] = [
      { field: 'code', headerName: 'Code', width: 140 },
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    ];
    if (resource === 'payment-terms') {
      cols.push({
        field: 'days',
        headerName: 'Days',
        width: 100,
        valueGetter: (_v, row) =>
          'days' in row ? (row as { days: number }).days : '—',
      });
    }
    if (resource === 'delivery-terms') {
      cols.push({
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) =>
          'description' in row
            ? ((row as { description: string | null }).description ?? '—')
            : '—',
      });
    }
    if (resource === 'tax-rules') {
      cols.push({
        field: 'gstPercent',
        headerName: 'GST %',
        width: 100,
        valueGetter: (_v, row) =>
          'gstPercent' in row
            ? (row as { gstPercent: number }).gstPercent
            : '—',
      });
    }
    cols.push({
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.row.status}
          color={params.row.status === 'active' ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    });
    return cols;
  }, [resource]);

  if (access && !caps.canViewAny) {
    return (
      <PermissionDenied
        title="Procurement masters unavailable"
        message="You need procurement_master.view, material.view, or vendor.view."
      />
    );
  }

  if (!visibleTabs.length) {
    return (
      <PermissionDenied
        title="No master catalogs available"
        message="Your role cannot view any procurement master catalogs."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="procurement-masters-page">
      <PageHeader
        subtitle="Payment terms, delivery terms, tax rules, and category catalogs."
        actions={
          <Stack direction="row" spacing={1}>
            {caps.canManageProcurement ? (
              <Button
                variant="outlined"
                disabled={seed.isPending}
                onClick={() => {
                  void (async () => {
                    try {
                      await seed.mutateAsync();
                      success('Default masters seeded');
                    } catch (err) {
                      notifyError(getErrorMessage(err));
                    }
                  })();
                }}
              >
                {seed.isPending ? 'Seeding…' : 'Seed defaults'}
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant="contained"
                onClick={() => {
                  setDialogMode('create');
                  setEditRow(null);
                  setDialogOpen(true);
                }}
              >
                Add
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Tabs
        value={resource}
        onChange={(_, next: MasterResource) => {
          setTab(next);
          setPage(1);
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {visibleTabs.map((t) => (
          <Tab key={t.id} value={t.id} label={t.label} />
        ))}
      </Tabs>

      <DataTable<MasterRow>
        title={TABS.find((t) => t.id === resource)?.label ?? 'Masters'}
        rows={list.data?.items ?? []}
        columns={columns}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle="No records"
        emptyDescription="Add a master or seed defaults."
        height={480}
        getRowId={(row) => row.id}
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={list.data?.meta?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        preferencesKey={`procurement-masters-${resource}`}
        rowActions={
          canManage
            ? [
                {
                  id: 'edit',
                  label: 'Edit',
                  onClick: (row) => {
                    setDialogMode('edit');
                    setEditRow(row);
                    setDialogOpen(true);
                  },
                },
              ]
            : undefined
        }
      />

      <MasterFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        resource={resource}
        mode={dialogMode}
        row={editRow}
      />
    </Stack>
  );
}
