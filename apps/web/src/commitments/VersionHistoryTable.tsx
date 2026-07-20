import { Link as RouterLink } from 'react-router-dom';
import {
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatInr } from '@/format';
import { CommitmentStatusChip } from './CommitmentStatusChip';
import type { PublicCommitment } from './types';

type Props = {
  versions: readonly PublicCommitment[];
  currentId: string;
};

export function VersionHistoryTable({ versions, currentId }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="version-history-table">
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Version history
      </Typography>
      {versions.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No history rows returned for this commitment number.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Committed</TableCell>
              <TableCell>Link</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {versions.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  bgcolor:
                    row.id === currentId ? 'action.selected' : undefined,
                }}
              >
                <TableCell>v{row.version}</TableCell>
                <TableCell>
                  <CommitmentStatusChip status={row.status} row={row} />
                </TableCell>
                <TableCell align="right">
                  {formatInr(row.commitmentAmount)}
                </TableCell>
                <TableCell>{formatDate(row.commitmentDate)}</TableCell>
                <TableCell>
                  {row.id === currentId ? (
                    'Current'
                  ) : (
                    <Link
                      component={RouterLink}
                      to={`/capital/commitments/${row.id}`}
                      underline="hover"
                    >
                      Open
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
