import {
  Box,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { EmptyState } from '@/components/errors';
import {
  formatOptionalCount,
  formatOptionalMoney,
} from '@/director-command-centre/formatMetric';
import type { VendorExceptionRow } from './types';

type Props = {
  rows: readonly VendorExceptionRow[];
  loading?: boolean;
};

export function VendorExceptionTable({ rows, loading = false }: Props) {
  return (
    <Box
      data-testid="purchase-vendor-exceptions"
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Vendor invoice exceptions
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={120} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No matching exceptions"
          description="Three-way match exceptions for this project will appear here."
        />
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Document</TableCell>
              <TableCell>Invoice #</TableCell>
              <TableCell>Vendor</TableCell>
              <TableCell>Match</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Variances</TableCell>
              <TableCell align="right">Payable</TableCell>
              <TableCell>Exception</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.documentNumber}</TableCell>
                <TableCell>{row.invoiceNumber}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {row.vendorId.slice(-8)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" color="warning" label={row.matchingStatus} />
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell align="right">
                  {formatOptionalCount(row.varianceCount)}
                </TableCell>
                <TableCell align="right">
                  {formatOptionalMoney(row.remainingPayable)}
                </TableCell>
                <TableCell>
                  {row.exceptionApproved ? 'Approved' : 'Open'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
