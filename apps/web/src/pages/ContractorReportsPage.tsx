import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
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
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  CTR_REPORT_OPTIONS,
  type CtrReportRows,
} from '@/contractor-reports/api';

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ContractorReportsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView =
    hasPermission('contractor_report.view') ||
    hasPermission('contractor.view');
  const [reportId, setReportId] = useState<string>(CTR_REPORT_OPTIONS[0].id);

  const option = useMemo(
    () =>
      CTR_REPORT_OPTIONS.find((o) => o.id === reportId) ??
      CTR_REPORT_OPTIONS[0],
    [reportId],
  );

  const query = useQuery({
    queryKey: ['ctr-report', reportId, selectedProjectId],
    queryFn: () => option.fetch(selectedProjectId || undefined),
    enabled: canView,
  });

  if (!canView) return <PermissionDenied />;
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const data = query.data as CtrReportRows | undefined;
  const rows = data?.rows ?? [];
  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((k) => k !== 'drillDown')
      : [];

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5">Contractor Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Register-style JSON reports for contractors, WOs, RA bills,
          retention, and recoveries.
        </Typography>
      </div>

      {!selectedProjectId ? (
        <Alert severity="info">
          Optional: select a project to scope WO / RA / retention / recovery
          reports.
        </Alert>
      ) : null}

      <TextField
        select
        size="small"
        label="Report"
        value={reportId}
        onChange={(e) => setReportId(e.target.value)}
        sx={{ maxWidth: 360 }}
      >
        {CTR_REPORT_OPTIONS.map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {option.label}
        </Typography>
        {data?.available === false ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Source module not registered — showing empty results
            {data.source ? ` (${data.source})` : ''}.
          </Typography>
        ) : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.length === 0 ? (
                <TableCell>No columns</TableCell>
              ) : (
                columns.map((col) => <TableCell key={col}>{col}</TableCell>)
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)}>
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)}>
                  <Typography variant="body2" color="text.secondary">
                    No rows
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={idx}>
                  {columns.map((col) => (
                    <TableCell key={col}>{cellValue(row[col])}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
