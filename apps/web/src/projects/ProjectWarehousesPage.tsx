import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { useAuth } from '@/auth/AuthContext';
import { DetailHeader } from '@/components/entity-detail';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import { WAREHOUSE_KIND_OPTIONS } from './constants';
import {
  useCreateProjectWarehouse,
  useProjectDetail,
  useProjectWarehouses,
} from './useProjects';
import { WarehouseKind } from './types';

type Props = {
  projectId?: string;
};

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
  const createMutation = useCreateProjectWarehouse(projectId ?? '');

  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [warehouseKind, setWarehouseKind] = useState<string>(
    WarehouseKind.MainStore,
  );
  const [address, setAddress] = useState('');

  const project = detailQuery.data;

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

  const warehouses = warehousesQuery.data ?? [];
  const kindLabel = (value: string | null) =>
    WAREHOUSE_KIND_OPTIONS.find((option) => option.value === value)?.label ??
    value ??
    '—';

  return (
    <Stack spacing={2.5} data-testid="project-warehouses-page">
      <DetailHeader
        title={`${project.projectName} warehouses`}
        code={project.projectCode}
        backTo={`/projects/${project.id}`}
        backLabel="Project"
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        {warehouses.length === 0 ? (
          <EmptyState
            title="No warehouses"
            description="Create a main store, site store, temporary store, or scrap yard."
          />
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Address</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell>{warehouse.siteCode}</TableCell>
                  <TableCell>{warehouse.siteName}</TableCell>
                  <TableCell>{kindLabel(warehouse.warehouseKind)}</TableCell>
                  <TableCell>{warehouse.status}</TableCell>
                  <TableCell>{warehouse.address ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {canManage ? (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6">Create warehouse</Typography>
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
            <TextField
              label="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              disabled={
                !siteCode.trim() ||
                !siteName.trim() ||
                createMutation.isPending
              }
              onClick={async () => {
                try {
                  await createMutation.mutateAsync({
                    siteCode: siteCode.trim(),
                    siteName: siteName.trim(),
                    warehouseKind,
                    address: address.trim() || null,
                  });
                  setSiteCode('');
                  setSiteName('');
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
