import { useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
  RetryPanel,
} from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { useProject } from '@/context/ProjectContext';
import {
  MaterialFilters,
  type MaterialFilterState,
} from '@/materials/MaterialFilters';
import { MaterialFormDrawer } from '@/materials/MaterialFormDrawer';
import { MaterialTable } from '@/materials/MaterialTable';
import { resolveMaterialCapabilities } from '@/materials/roleAccess';
import { MaterialStatus, type PublicMaterial } from '@/materials/types';
import {
  useMaterialLedgerOptions,
  useMaterialsList,
  useUpdateMaterial,
} from '@/materials/useMaterials';

/**
 * Material catalogue — `/inventory/materials` (Micro Phase 058).
 *
 * Nest: `GET/POST/PATCH /materials`, `GET /materials/units`.
 * Permissions: `material.view` / `material.manage` (not create/update codes).
 */
export function MaterialsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveMaterialCapabilities(hasPermission);
  const { selectedProjectId, isLoading: projectLoading } = useProject();
  const { success, error: notifyError } = useNotify();
  const update = useUpdateMaterial();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MaterialFilterState>({
    status: '',
    category: '',
    baseUnit: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<PublicMaterial | null>(null);

  const canView = Boolean(access) && caps.canView;
  const canViewAccounts = Boolean(access) && hasPermission('account.view');

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: filters.status || undefined,
      category: filters.category.trim().toLowerCase() || undefined,
      baseUnit: filters.baseUnit || undefined,
    }),
    [page, pageSize, search, filters],
  );

  // Material master is global, but portal sessions still send X-Project-Id.
  // Require a selected project so project-access denials surface consistently.
  const enabled = canView && Boolean(selectedProjectId);
  const list = useMaterialsList(listQuery, enabled);
  const ledgerQuery = useMaterialLedgerOptions(
    enabled && (caps.canManage || canViewAccounts),
  );

  const categorySuggestions = useMemo(
    () => (list.data?.items ?? []).map((m) => m.category),
    [list.data?.items],
  );

  const ledgerOptions = useMemo(
    () =>
      (ledgerQuery.data ?? []).map((a) => ({
        id: a.id,
        label: `${a.accountCode} — ${a.accountName}`,
      })),
    [ledgerQuery.data],
  );

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: PublicMaterial) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  const toggleStatus = async (row: PublicMaterial) => {
    const next =
      row.status === MaterialStatus.Active
        ? MaterialStatus.Inactive
        : MaterialStatus.Active;
    try {
      await update.mutateAsync({ id: row.id, input: { status: next } });
      success(
        next === MaterialStatus.Active
          ? 'Material activated'
          : 'Material deactivated',
      );
    } catch (err) {
      notifyError(getErrorMessage(err, 'Status update failed'));
    }
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Materials unavailable"
        message="You need material.view to open the material catalogue."
      />
    );
  }

  if (projectLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Select a project"
        description="Choose a project in the header to continue. Materials are organisation-wide, but project context is required for portal access."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="materials-page">
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 1.5,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h4">Materials</Typography>
          <Typography color="text.secondary">
            Catalogue of material masters, units, and reorder settings.
          </Typography>
        </Stack>
        {caps.canManage ? (
          <Button variant="contained" onClick={openCreate}>
            New material
          </Button>
        ) : null}
      </Box>

      {list.isError ? (
        <RetryPanel error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <MaterialTable
          rows={list.data?.items ?? []}
          loading={list.isLoading || list.isFetching}
          page={page}
          pageSize={pageSize}
          rowCount={list.data?.meta?.total ?? 0}
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
            <MaterialFilters
              value={filters}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
              categorySuggestions={categorySuggestions}
            />
          }
          caps={caps}
          onEdit={caps.canManage ? openEdit : undefined}
          onToggleStatus={caps.canManage ? toggleStatus : undefined}
        />
      )}

      {caps.canManage && !canViewAccounts ? (
        <Alert severity="info">
          Ledger account picker needs `account.view`. You can still paste a
          ledger ObjectId when creating materials.
        </Alert>
      ) : null}

      <MaterialFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        material={editTarget}
        ledgerOptions={ledgerOptions}
        canViewAccounts={canViewAccounts}
      />
    </Stack>
  );
}
