import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DataTable } from '@/components/DataTable';
import { DetailHeader } from '@/components/entity-detail';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { WAREHOUSE_KIND_OPTIONS } from './constants';
import {
  useCreateProjectWarehouse,
  useProjectDetail,
  useProjectStructure,
  useProjectWarehouses,
} from './useProjects';
import {
  StructureSiteType,
  WarehouseKind,
  type PublicProjectSite,
  type PublicProjectSiteNode,
} from './types';

type Props = {
  projectId?: string;
};

type SiteOption = { id: string; label: string; siteCode: string; siteName: string };

/** Structure nodes only (not existing warehouses) for linking a store to a project site. */
function flattenStructureSiteOptions(
  nodes: PublicProjectSiteNode[],
  depth = 0,
): SiteOption[] {
  return nodes.flatMap((node) => {
    const childOptions = flattenStructureSiteOptions(node.children ?? [], depth + 1);
    if (node.type === StructureSiteType.Warehouse) {
      return childOptions;
    }
    return [
      {
        id: node.id,
        label: `${'—'.repeat(depth)} ${node.siteCode} · ${node.siteName}`,
        siteCode: node.siteCode,
        siteName: node.siteName,
      },
      ...childOptions,
    ];
  });
}

function flattenSiteLabelMap(
  nodes: PublicProjectSiteNode[],
): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (list: PublicProjectSiteNode[]) => {
    for (const node of list) {
      map.set(node.id, `${node.siteCode} · ${node.siteName}`);
      walk(node.children ?? []);
    }
  };
  walk(nodes);
  return map;
}

export function ProjectWarehousesPage({
  projectId: projectIdProp,
}: Props = {}) {
  const params = useParams<{ projectId: string }>();
  const projectId = projectIdProp ?? params.projectId;
  const { access, hasPermission } = useAuth();
  const notify = useNotify();
  const canView = Boolean(access) && hasPermission('site.view');
  const canManage = hasPermission('site.manage');
  const detailQuery = useProjectDetail(projectId, canView);
  const warehousesQuery = useProjectWarehouses(projectId, canView);
  const structureQuery = useProjectStructure(projectId, canView);
  const createMutation = useCreateProjectWarehouse(projectId ?? '');

  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [warehouseKind, setWarehouseKind] = useState<string>(
    WarehouseKind.MainStore,
  );
  const [parentSiteId, setParentSiteId] = useState('');
  const [address, setAddress] = useState('');

  const project = detailQuery.data;
  const siteOptions = useMemo(
    () => flattenStructureSiteOptions(structureQuery.data ?? []),
    [structureQuery.data],
  );
  const siteLabelById = useMemo(
    () => flattenSiteLabelMap(structureQuery.data ?? []),
    [structureQuery.data],
  );
  const warehouses = warehousesQuery.data ?? [];
  const columns = useMemo<GridColDef<PublicProjectSite>[]>(
    () => [
      {
        field: 'siteCode',
        headerName: 'Code',
        width: 130,
      },
      {
        field: 'siteName',
        headerName: 'Name',
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'warehouseKind',
        headerName: 'Kind',
        width: 140,
        valueGetter: (_v, row) =>
          WAREHOUSE_KIND_OPTIONS.find(
            (option) => option.value === row.warehouseKind,
          )?.label ??
          row.warehouseKind ??
          '—',
      },
      {
        field: 'parentSiteId',
        headerName: 'Site',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) =>
          row.parentSiteId
            ? (siteLabelById.get(row.parentSiteId) ?? '—')
            : '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
      },
      {
        field: 'address',
        headerName: 'Address',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => row.address ?? '—',
      },
    ],
    [siteLabelById],
  );
  const siteStoreRequiresParent =
    warehouseKind === WarehouseKind.SiteStore;
  const canSubmit =
    Boolean(siteCode.trim()) &&
    Boolean(siteName.trim()) &&
    (!siteStoreRequiresParent || Boolean(parentSiteId)) &&
    !createMutation.isPending;

  if (
    !access ||
    (canView && (detailQuery.isLoading || warehousesQuery.isLoading))
  ) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (
    !canView ||
    (detailQuery.error && isForbiddenError(detailQuery.error)) ||
    (warehousesQuery.error && isForbiddenError(warehousesQuery.error))
  ) {
    return (
      <PermissionDenied
        error={detailQuery.error ?? warehousesQuery.error}
        title="Project warehouses unavailable"
        message="You need site.view and explicit project access."
      />
    );
  }

  if (detailQuery.error || !project) {
    return (
      <RetryPanel
        error={detailQuery.error ?? new Error('Project not found')}
        onRetry={() => void detailQuery.refetch()}
        forceRetry
      />
    );
  }

  if (warehousesQuery.error) {
    return (
      <RetryPanel
        error={warehousesQuery.error}
        onRetry={() => void warehousesQuery.refetch()}
        forceRetry
      />
    );
  }

  const applyParentSite = (nextParentId: string) => {
    setParentSiteId(nextParentId);
    const selected = siteOptions.find((option) => option.id === nextParentId);
    if (!selected) return;
    // Prefill from the project site when creating a store for that site.
    if (!siteCode.trim()) {
      setSiteCode(`${selected.siteCode}-WH`);
    }
    if (!siteName.trim()) {
      setSiteName(`${selected.siteName} store`);
    }
  };

  return (
    <Stack spacing={2.5} data-testid="project-warehouses-page">
      <DetailHeader
        title={`${project.projectName} warehouses`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <DataTable
        title="Warehouses"
        rows={warehouses}
        columns={columns}
        getRowId={(row) => row.id}
        emptyTitle="No warehouses"
        emptyDescription="Create a main store, site store, temporary store, or scrap yard. Site stores can be linked to a project site from Structure."
        height={360}
        paginationMode="client"
        mobileCard={{
          primaryField: 'siteCode',
          metaFields: ['siteName', 'warehouseKind'],
          statusField: 'status',
        }}
        showColumnVisibility={false}
      />

      {canManage ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Create warehouse</Typography>
            {structureQuery.isError ? (
              <Alert severity="warning">
                Project sites could not be loaded. You can still create a
                warehouse without a linked site, or{' '}
                <Button
                  size="small"
                  onClick={() => void structureQuery.refetch()}
                >
                  retry
                </Button>
                .
              </Alert>
            ) : null}
            {!structureQuery.isLoading &&
            !structureQuery.isError &&
            siteOptions.length === 0 ? (
              <Alert severity="info">
                No project sites yet.{' '}
                <Button
                  component={RouterLink}
                  to={`/projects/${project.id}/structure`}
                  size="small"
                >
                  Add a site in Structure
                </Button>{' '}
                first, then link a site store here.
              </Alert>
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Warehouse code"
                value={siteCode}
                onChange={(event) => setSiteCode(event.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Warehouse name"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                fullWidth
                required
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="warehouse-kind">Kind</InputLabel>
                <Select
                  labelId="warehouse-kind"
                  label="Kind"
                  value={warehouseKind}
                  onChange={(event) => setWarehouseKind(event.target.value)}
                >
                  {WAREHOUSE_KIND_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                fullWidth
                required={siteStoreRequiresParent}
                disabled={structureQuery.isLoading || siteOptions.length === 0}
              >
                <InputLabel id="warehouse-parent-site">
                  Project site
                </InputLabel>
                <Select
                  labelId="warehouse-parent-site"
                  label="Project site"
                  value={parentSiteId}
                  onChange={(event) => applyParentSite(event.target.value)}
                >
                  {!siteStoreRequiresParent ? (
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                  ) : null}
                  {siteOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  {siteStoreRequiresParent
                    ? 'Required for site store — choose a site from this project’s Structure.'
                    : 'Optional — link this warehouse under a project site from Structure.'}
                </FormHelperText>
              </FormControl>
            </Stack>
            <TextField
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              disabled={!canSubmit}
              onClick={async () => {
                try {
                  await createMutation.mutateAsync({
                    siteCode: siteCode.trim(),
                    siteName: siteName.trim(),
                    warehouseKind,
                    parentSiteId: parentSiteId || null,
                    address: address.trim() || null,
                  });
                  setSiteCode('');
                  setSiteName('');
                  setParentSiteId('');
                  setAddress('');
                  notify.success('Warehouse created');
                } catch (error) {
                  notify.error(getErrorMessage(error));
                }
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              Create warehouse
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
