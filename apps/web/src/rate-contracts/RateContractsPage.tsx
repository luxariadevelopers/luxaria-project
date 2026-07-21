import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import { listRateContracts } from '@/rate-contracts/api';

function rateLineCount(row: {
  boqItemRates?: unknown[];
  labourRates?: unknown[];
  materialInclusiveRates?: unknown[];
  equipmentRates?: unknown[];
}): number {
  return (
    (row.boqItemRates?.length ?? 0) +
    (row.labourRates?.length ?? 0) +
    (row.materialInclusiveRates?.length ?? 0) +
    (row.equipmentRates?.length ?? 0)
  );
}

export function RateContractsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('rate_contract.view');

  const query = useQuery({
    queryKey: ['rate-contracts', selectedProjectId ?? 'all'],
    queryFn: () =>
      listRateContracts(
        selectedProjectId ? { projectId: selectedProjectId } : {},
      ),
    enabled: canView,
  });

  if (!canView) return <PermissionDenied />;
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Rate Contracts</Typography>
      <Typography variant="body2" color="text.secondary">
        Schedule of rates (BOQ, labour, material-inclusive, equipment) with
        retention, tax, advance recovery, and LD terms. Company-wide or
        project-scoped. Agreements and work orders consume the active revision.
      </Typography>
      {!selectedProjectId ? (
        <Alert severity="info">
          Showing all accessible rate contracts. Select a project to filter
          project-scoped schedules.
        </Alert>
      ) : null}
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contract #</TableCell>
              <TableCell>Ver</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Validity</TableCell>
              <TableCell>Rates</TableCell>
              <TableCell>Retention %</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No rate contracts yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.contractNumber}</TableCell>
                  <TableCell>v{row.version}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row.scope} variant="outlined" />
                  </TableCell>
                  <TableCell>{row.title || '—'}</TableCell>
                  <TableCell>
                    {String(row.validityFrom).slice(0, 10)} →{' '}
                    {String(row.validityTo).slice(0, 10)}
                  </TableCell>
                  <TableCell>{rateLineCount(row)}</TableCell>
                  <TableCell>{row.retentionPercent}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
