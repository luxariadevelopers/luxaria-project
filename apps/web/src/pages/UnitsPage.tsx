import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import {
  EmptyState,
  PermissionDenied,
} from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  UnitFilters,
  type UnitFilterState,
} from '@/units/UnitFilters';
import { UnitFormDrawer } from '@/units/UnitFormDrawer';
import { UnitStatusDialog } from '@/units/UnitStatusDialog';
import { UnitTable } from '@/units/UnitTable';
import { resolveUnitCapabilities } from '@/units/roleAccess';
import type { PublicUnit } from '@/units/types';
import { useUnitBookings, useUnitsList } from '@/units/useUnits';

/**
 * Unit inventory list — `/sales/units` (Micro Phase 097).
 *
 * Nest: `GET/POST /units`, `PATCH /units/:id`, `POST /units/:id/status`.
 * Permissions: `unit.view` / `unit.manage` (not create/update/block codes).
 */
export function UnitsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveUnitCapabilities(hasPermission);
  const { selectedProjectId, isLoading: projectLoading } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<UnitFilterState>({
    status: '',
    unitType: '',
    block: '',
    floor: '',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<PublicUnit | null>(null);
  const [statusTarget, setStatusTarget] = useState<PublicUnit | null>(null);

  const canView = Boolean(access) && caps.canView;

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      search: search.trim() || undefined,
      status: filters.status || undefined,
      unitType: filters.unitType || undefined,
      block: filters.block.trim() || undefined,
      floor: filters.floor.trim() || undefined,
    }),
    [page, pageSize, search, filters, selectedProjectId],
  );

  const enabled = canView && Boolean(selectedProjectId);
  const list = useUnitsList(listQuery, enabled);

  const statusBookings = useUnitBookings(
    statusTarget?.id ?? null,
    Boolean(statusTarget) && caps.canViewBookings,
  );

  const openCreate = () => {
    setDrawerMode('create');
    setEditTarget(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: PublicUnit) => {
    setDrawerMode('edit');
    setEditTarget(row);
    setDrawerOpen(true);
  };

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Units unavailable"
        message="You need unit.view to open the unit inventory."
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
        description="Choose a project in the header to manage unit inventory for that site."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="units-page">
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
          <Typography variant="h4">Units</Typography>
          <Typography color="text.secondary">
            Project / block / floor inventory with pricing and status.
          </Typography>
        </Stack>
        {caps.canCreate ? (
          <Button variant="contained" onClick={openCreate}>
            New unit
          </Button>
        ) : null}
      </Box>

      <UnitTable
        rows={list.data?.items ?? []}
        loading={list.isLoading || list.isFetching}
        error={list.error}
        onRetry={() => void list.refetch()}
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
          <UnitFilters
            value={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
          />
        }
        caps={caps}
        onEdit={caps.canUpdate ? openEdit : undefined}
        onChangeStatus={
          caps.canChangeStatus ? (row) => setStatusTarget(row) : undefined
        }
      />

      <UnitFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode={drawerMode}
        projectId={selectedProjectId}
        unit={editTarget}
        existingUnits={list.data?.items ?? []}
      />

      <UnitStatusDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        unit={statusTarget}
        bookings={statusBookings.data ?? []}
      />
    </Stack>
  );
}
