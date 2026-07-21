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
  SE_REPORT_OPTIONS,
  type SeReportRows,
} from '@/site-execution-reports/api';

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function SiteExecutionReportsPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('dashboard.view');
  const [reportId, setReportId] = useState<string>(SE_REPORT_OPTIONS[0].id);

  const option = useMemo(
    () => SE_REPORT_OPTIONS.find((o) => o.id === reportId) ?? SE_REPORT_OPTIONS[0],
    [reportId],
  );

  const query = useQuery({
    queryKey: ['se-report', reportId, selectedProjectId],
    queryFn: () => option.fetch(selectedProjectId!),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view site execution reports.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const data = query.data as SeReportRows | undefined;
  const rows = data?.rows ?? [];
  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((k) => k !== 'drillDown')
      : [];

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5">Site Execution Reports</Typography>
        <Typography variant="body2" color="text.secondary">
          Tabular registers from DPR, labour, ledger, and optional SE modules.
        </Typography>
      </div>

      <TextField
        select
        size="small"
        label="Report"
        value={reportId}
        onChange={(e) => setReportId(e.target.value)}
        sx={{ maxWidth: 360 }}
      >
        {SE_REPORT_OPTIONS.map((opt) => (
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
            Source module not registered — showing empty or DPR fallback
            {data.source ? ` (${data.source})` : ''}.
          </Typography>
        ) : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.length === 0 ? (
                <TableCell>Result</TableCell>
              ) : (
                columns.map((col) => <TableCell key={col}>{col}</TableCell>)
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(columns.length, 1)}>
                  <Typography variant="body2" color="text.secondary">
                    {query.isLoading ? 'Loading…' : 'No rows for this report.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.slice(0, 100).map((row, idx) => (
                <TableRow key={String((row as { id?: string }).id ?? idx)}>
                  {columns.map((col) => (
                    <TableCell key={col}>
                      {cellValue((row as Record<string, unknown>)[col])}
                    </TableCell>
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
