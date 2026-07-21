import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useProject } from '@/context/ProjectContext';
import {
  fetchContractorTenders,
  type ContractorTenderStatus,
} from '@/contractor-tenders/api';

function statusColor(
  status: ContractorTenderStatus,
): 'default' | 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'draft':
      return 'default';
    case 'invited':
      return 'info';
    case 'bidding':
      return 'warning';
    case 'under_evaluation':
      return 'info';
    case 'awarded':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

function canCompare(status: ContractorTenderStatus): boolean {
  return (
    status === 'bidding' ||
    status === 'under_evaluation' ||
    status === 'awarded'
  );
}

/**
 * Contractor tenders list — wire under Contractors / Commercial
 * (`tender.view`). See `CTR-INTEGRATION.md`.
 */
export function TenderListPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canView = hasPermission('tender.view');

  const query = useQuery({
    queryKey: ['contractor-tenders', selectedProjectId],
    queryFn: () => fetchContractorTenders({ projectId: selectedProjectId! }),
    enabled: canView && Boolean(selectedProjectId),
  });

  if (!canView) return <PermissionDenied />;
  if (!selectedProjectId) {
    return (
      <Alert severity="info">Select a project to view contractor tenders.</Alert>
    );
  }
  if (query.isError) {
    return <RetryPanel onRetry={() => void query.refetch()} />;
  }

  const rows = query.data ?? [];

  return (
    <Stack spacing={2} data-testid="tender-list-page">
      <Typography variant="h5">Contractor Tenders</Typography>
      <Typography variant="body2" color="text.secondary">
        Invite contractors, record technical/commercial bids, compare, recommend,
        and award. Workflow: draft → invited → bidding → under evaluation →
        awarded.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Number</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Invited</TableCell>
              <TableCell>Bids</TableCell>
              <TableCell>Bid deadline</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No tenders for this project.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.tenderNumber}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status.replaceAll('_', ' ')}
                      color={statusColor(row.status)}
                    />
                  </TableCell>
                  <TableCell>{row.invitedContractorIds.length}</TableCell>
                  <TableCell>
                    {row.commercialBids.length}C / {row.technicalBids.length}T
                  </TableCell>
                  <TableCell>
                    {row.bidDeadline
                      ? new Date(row.bidDeadline).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    {canCompare(row.status) ? (
                      <Link
                        component={RouterLink}
                        to={`/contractor-tenders/${row.id}/compare`}
                        underline="hover"
                        variant="body2"
                      >
                        Compare
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
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
