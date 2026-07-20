import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { reopenRequestStatusLabel } from './labels';
import {
  PeriodReopenRequestStatus,
  type PublicPeriodReopenRequest,
} from './types';

type Props = {
  rows: PublicPeriodReopenRequest[];
  canApprove: boolean;
  onApprove: (row: PublicPeriodReopenRequest) => void;
  onReject: (row: PublicPeriodReopenRequest) => void;
};

function statusColor(
  status: string,
): 'default' | 'success' | 'error' | 'warning' {
  if (status === PeriodReopenRequestStatus.Approved) return 'success';
  if (status === PeriodReopenRequestStatus.Rejected) return 'error';
  if (status === PeriodReopenRequestStatus.Pending) return 'warning';
  return 'default';
}

export function PeriodReopenHistory({
  rows,
  canApprove,
  onApprove,
  onReject,
}: Props) {
  return (
    <Stack spacing={1.5} data-testid="period-reopen-history">
      <Typography variant="h6">Reopen history</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Requested</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const pending =
                row.status === PeriodReopenRequestStatus.Pending;
              return (
                <TableRow key={row.id} data-testid={`reopen-row-${row.id}`}>
                  <TableCell>
                    {row.createdAt
                      ? dayjs(row.createdAt).format('DD MMM YYYY HH:mm')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.reason}</Typography>
                    {row.rejectionReason ? (
                      <Typography variant="caption" color="error">
                        Rejected: {row.rejectionReason}
                      </Typography>
                    ) : null}
                    {row.approvalNote ? (
                      <Typography variant="caption" color="text.secondary">
                        Note: {row.approvalNote}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={statusColor(row.status)}
                      variant="outlined"
                      label={reopenRequestStatusLabel(row.status)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {canApprove && pending ? (
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ justifyContent: 'flex-end' }}
                      >
                        <Button
                          size="small"
                          onClick={() => onApprove(row)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => onReject(row)}
                        >
                          Reject
                        </Button>
                      </Stack>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No reopen requests for this period.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
