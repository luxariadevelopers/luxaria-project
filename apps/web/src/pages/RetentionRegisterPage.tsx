import { useQuery } from '@tanstack/react-query';
import {
  Alert,
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
import { fetchRetentionRegister } from '@/contractor-retention/api';

function money(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Retention register — contractor-wise held / released balances.
 * Nest: `GET /contractor-retention/register`
 * Permission: `contractor_retention.view`
 */
export function RetentionRegisterPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('contractor_retention.view');

  const query = useQuery({
    queryKey: ['retention-register', selectedProjectId],
    queryFn: () => fetchRetentionRegister({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view the retention register.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2}>
      <div>
        <Typography variant="h5">Retention Register</Typography>
        <Typography variant="body2" color="text.secondary">
          Contractor-wise retention held from posted RA bills, releases by stage
          (practical completion / defect liability / BG replacement), and
          ceiling. RA bills credit Retention Payable on post; release workflow
          lives in contractor-retention.
        </Typography>
      </div>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Contractor</TableCell>
              <TableCell>Agreement</TableCell>
              <TableCell align="right">Ceiling</TableCell>
              <TableCell align="right">Deducted</TableCell>
              <TableCell align="right">Released</TableCell>
              <TableCell align="right">Balance held</TableCell>
              <TableCell align="right"># Ded.</TableCell>
              <TableCell align="right"># Rel.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary">
                    No approved retention holdings for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={`${row.contractorId}-${row.agreementId ?? 'none'}`}
                >
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {row.contractorId}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {row.agreementId ?? '—'}
                  </TableCell>
                  <TableCell align="right">{money(row.ceilingAmount)}</TableCell>
                  <TableCell align="right">{money(row.totalDeducted)}</TableCell>
                  <TableCell align="right">{money(row.totalReleased)}</TableCell>
                  <TableCell align="right">{money(row.balanceHeld)}</TableCell>
                  <TableCell align="right">{row.deductionCount}</TableCell>
                  <TableCell align="right">{row.releaseCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}
