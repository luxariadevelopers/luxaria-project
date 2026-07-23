import { useMemo, useState } from 'react';
import { Button, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState, PermissionDenied } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { useProjectWarehouses } from '@/projects/useProjects';
import {
  resolveWarehouseLocationCapabilities,
  WarehouseLocationFilters,
  WarehouseLocationFormDrawer,
  WarehouseLocationTable,
  type PublicWarehouseLocation,
  type WarehouseLocationFilterState,
  type WarehouseLocationLevel,
  type WarehouseLocationStatus,
  useWarehouseLocationsList,
} from '@/warehouse-locations';

/**
 * Warehouse locations (zone / rack / bin) — `/inventory/warehouse-locations`.
 */
export function WarehouseLocationsPage() {
  const { hasPermission, access } = useAuth();
  const caps = resolveWarehouseLocationCapabilities(hasPermission);
  const { selectedProjectId } = useProject();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<WarehouseLocationFilterState>({
    warehouseId: '',
    level: '',
    status: '',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PublicWarehouseLocation | null>(null);

  const warehousesQuery = useProjectWarehouses(
    selectedProjectId ?? undefined,
    caps.canView && Boolean(selectedProjectId),
  );

  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data ?? []).map((wh) => ({
        id: wh.id,
        label: `${wh.siteCode} · ${wh.siteName}`,
      })),
    [warehousesQuery.data],
  );

  const warehouseLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const wh of warehouseOptions) map.set(wh.id, wh.label);
    return map;
  }, [warehouseOptions]);

  const listQuery = useMemo(
    () => ({
      page,
      limit: pageSize,
      projectId: selectedProjectId ?? undefined,
      warehouseId: filters.warehouseId || undefined,
      level: (filters.level || undefined) as WarehouseLocationLevel | undefined,
      status: (filters.status || undefined) as
        | WarehouseLocationStatus
        | undefined,
    }),
    [filters, page, pageSize, selectedProjectId],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const list = useWarehouseLocationsList(listQuery, enabled);

  if (access && !caps.canView) {
    return (
      <PermissionDenied
        title="Warehouse locations unavailable"
        message="You need the site.view permission to browse warehouse locations."
      />
    );
  }

  if (!selectedProjectId) {
    return (
      <EmptyState
        title="Project required"
        description="Select a project in the header to manage warehouse zones, racks, and bins."
      />
    );
  }

  if (
    (list.error && isForbiddenError(list.error)) ||
    (warehousesQuery.error && isForbiddenError(warehousesQuery.error))
  ) {
    return (
      <PermissionDenied
        error={list.error ?? warehousesQuery.error}
        title="Warehouse locations denied"
        message="You do not have permission to load warehouse locations for this project."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="warehouse-locations-page">
      <Typography color="text.secondary">
        Hierarchical storage under project warehouses (zone → rack → bin).{' '}
        <Link
          component={RouterLink}
          to={`/projects/${selectedProjectId}/warehouses`}
          underline="hover"
        >
          Manage warehouses
        </Link>
      </Typography>

      {warehouseOptions.length === 0 && !warehousesQuery.isLoading ? (
        <EmptyState
          title="No warehouses yet"
          description="Create a warehouse for this project before adding zones, racks, or bins."
        >
          <Button
            component={RouterLink}
            to={`/projects/${selectedProjectId}/warehouses`}
            variant="contained"
          >
            Open project warehouses
          </Button>
        </EmptyState>
      ) : (
        <WarehouseLocationTable
          rows={list.data?.items ?? []}
          loading={list.isLoading || warehousesQuery.isLoading}
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
          filterSlot={
            <WarehouseLocationFilters
              value={filters}
              warehouses={warehouseOptions}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
            />
          }
          toolbarActions={
            caps.canManage ? (
              <Button
                variant="contained"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                data-testid="warehouse-location-create"
              >
                Add location
              </Button>
            ) : undefined
          }
          caps={caps}
          warehouseLabelById={warehouseLabelById}
          onEdit={
            caps.canManage
              ? (row) => {
                  setEditing(row);
                  setFormOpen(true);
                }
              : undefined
          }
        />
      )}

      <WarehouseLocationFormDrawer
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        projectId={selectedProjectId}
        warehouses={warehouseOptions}
        location={editing}
      />
    </Stack>
  );
}
