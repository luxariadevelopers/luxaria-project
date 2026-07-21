import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
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
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { fetchComplianceExpiring } from '@/contractors/complianceApi';

function daysChip(days: number | null, isValid: boolean | null) {
  if (days === null) return <Chip size="small" label="N/A" />;
  if (isValid === false || days < 0) {
    return <Chip size="small" color="error" label={`Expired (${days}d)`} />;
  }
  if (days <= 14) {
    return <Chip size="small" color="warning" label={`${days}d`} />;
  }
  return <Chip size="small" color="success" label={`${days}d`} />;
}

export function ContractorCompliancePage() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('contractor.view');
  const [withinDays, setWithinDays] = useState(30);

  const query = useQuery({
    queryKey: ['contractor-compliance-expiring', withinDays],
    queryFn: () => fetchComplianceExpiring(withinDays),
    enabled: canView,
  });

  if (!canView) return <PermissionDenied />;
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data?.rows ?? [];

  return (
    <Stack spacing={3}>
      <div>
        <Typography variant="h5">Contractor Compliance</Typography>
        <Typography variant="body2" color="text.secondary">
          Labour licence and insurance expiries across the contractor master.
        </Typography>
      </div>

      <TextField
        select
        size="small"
        label="Within days"
        value={withinDays}
        onChange={(e) => setWithinDays(Number(e.target.value))}
        sx={{ maxWidth: 200 }}
      >
        {[14, 30, 60, 90].map((d) => (
          <MenuItem key={d} value={d}>
            {d} days
          </MenuItem>
        ))}
      </TextField>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Labour licence</TableCell>
              <TableCell>Insurance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No expiries in the selected window.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.contractorId}>
                  <TableCell>{row.contractorCode}</TableCell>
                  <TableCell>{row.legalName}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        {row.labourLicence.licenceNumber ?? '—'}
                      </Typography>
                      {daysChip(
                        row.labourLicence.daysRemaining,
                        row.labourLicence.isValid,
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        {row.insurance.policyNumber ?? '—'}
                      </Typography>
                      {daysChip(
                        row.insurance.daysRemaining,
                        row.insurance.isValid,
                      )}
                    </Stack>
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
