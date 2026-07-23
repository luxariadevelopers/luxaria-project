import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { formatDate, formatInr } from '@/format';
import type {
  ContractorRecoveryStatus,
  ContractorRecoveryType,
} from '@/contractor-recoveries/api';
import { RecoveryFormDrawer } from '@/contractor-recoveries/RecoveryFormDrawer';
import {
  RECOVERY_STATUS_OPTIONS,
  RECOVERY_TYPE_OPTIONS,
  recoveryStatusLabel,
  recoveryTypeLabel,
} from '@/contractor-recoveries/labels';
import { resolveContractorRecoveryCapabilities } from '@/contractor-recoveries/roleAccess';
import {
  useContractorOptions,
  useContractorRecoveriesList,
} from '@/contractor-recoveries/useContractorRecoveries';

function statusColor(
  status: ContractorRecoveryStatus,
): 'default' | 'warning' | 'info' | 'success' {
  switch (status) {
    case 'draft':
      return 'warning';
    case 'approved':
      return 'info';
    case 'posted':
      return 'success';
    default:
      return 'default';
  }
}

/**
 * Contractor recoveries list — `/contractor-recoveries`.
 * Nest: GET/POST /contractor-recoveries
 * Permissions: `contractor_recovery.view|manage`
 */
export function ContractorRecoveriesPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const caps = resolveContractorRecoveryCapabilities(hasPermission);
  const { selectedProjectId } = useProject();
  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<ContractorRecoveryType | ''>('');
  const [status, setStatus] = useState<ContractorRecoveryStatus | ''>('');
  const [contractorId, setContractorId] = useState('');

  const listQuery = useMemo(
    () => ({
      projectId: selectedProjectId ?? undefined,
      type: type || undefined,
      status: status || undefined,
      contractorId: contractorId || undefined,
      page: 1,
      limit: 50,
    }),
    [selectedProjectId, type, status, contractorId],
  );

  const enabled = caps.canView && Boolean(selectedProjectId);
  const query = useContractorRecoveriesList(listQuery, enabled);
  const contractors = useContractorOptions('', enabled);

  if (!caps.canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">
        Select a project to view contractor recoveries.
      </Alert>
    );
  }
  if (query.isError) {
    return (
      <RetryPanel
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <Typography variant="h5">Contractor Recoveries</Typography>
          <Typography variant="body2" color="text.secondary">
            Advances, retention, material, TDS and manual recoveries against
            contractors. Draft → approve → post (optionally onto a bill).
          </Typography>
        </div>
        {caps.canManage ? (
          <Button variant="contained" onClick={() => setCreateOpen(true)}>
            New recovery
          </Button>
        ) : null}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          select
          size="small"
          label="Type"
          value={type}
          onChange={(e) =>
            setType(e.target.value as ContractorRecoveryType | '')
          }
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All types</MenuItem>
          {RECOVERY_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as ContractorRecoveryStatus | '')
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {RECOVERY_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Contractor"
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All contractors</MenuItem>
          {(contractors.data ?? []).map((opt) => (
            <MenuItem key={opt.id} value={opt.id}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Contractor</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No recoveries for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography
                      component={RouterLink}
                      to={`/contractor-recoveries/${row.id}`}
                      variant="body2"
                      color="primary"
                      sx={{ textDecoration: 'none' }}
                    >
                      {recoveryTypeLabel(row.type)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {contractors.data?.find((c) => c.id === row.contractorId)
                      ?.label ?? row.contractorId.slice(-6)}
                  </TableCell>
                  <TableCell align="right">{formatInr(row.amount)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={recoveryStatusLabel(row.status)}
                      color={statusColor(row.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {row.createdAt ? formatDate(row.createdAt) : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <RecoveryFormDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={selectedProjectId}
        canManage={caps.canManage}
        onSaved={(row) => navigate(`/contractor-recoveries/${row.id}`)}
      />
    </Stack>
  );
}
