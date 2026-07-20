import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { EmptyState } from '@/components/errors';
import {
  formatOptionalCount,
  formatOptionalMoney,
} from '@/director-command-centre/formatMetric';
import type { AgeingRow } from './types';

type Props = {
  title: string;
  rows: readonly AgeingRow[];
  loading?: boolean;
  emptyDescription: string;
};

export function AgeingList({
  title,
  rows,
  loading = false,
  emptyDescription,
}: Props) {
  return (
    <Box
      data-testid="purchase-ageing-list"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={120} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nothing due" description={emptyDescription} />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reference</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due</TableCell>
              <TableCell align="right">Age (days)</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, 25).map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography
                    component={RouterLink}
                    to={row.href}
                    variant="body2"
                    sx={{ color: 'primary.main', textDecoration: 'none' }}
                  >
                    {row.reference}
                  </Typography>
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.dueDate}</TableCell>
                <TableCell align="right">
                  {formatOptionalCount(row.ageDays)}
                </TableCell>
                <TableCell align="right">
                  {formatOptionalMoney(row.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
