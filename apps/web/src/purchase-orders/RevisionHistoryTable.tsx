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
import { POStatusChip } from './POStatusChip';
import { PURCHASE_ORDER_ROUTES } from './routes';
import type { PublicPurchaseOrder } from './types';

type Props = {
  versions: readonly PublicPurchaseOrder[];
  currentId: string;
};

export function RevisionHistoryTable({ versions, currentId }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="po-revision-history">
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Revision history
      </Typography>
      {versions.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No revision rows returned for this purchase order family.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rev</TableCell>
              <TableCell>PO number</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Order date</TableCell>
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
                <TableCell>r{row.revisionNumber}</TableCell>
                <TableCell>{row.purchaseOrderNumber}</TableCell>
                <TableCell>
                  <POStatusChip status={row.status} />
                </TableCell>
                <TableCell align="right">{formatInr(row.total)}</TableCell>
                <TableCell>{formatDate(row.orderDate)}</TableCell>
                <TableCell>
                  {row.id === currentId ? (
                    'Current'
                  ) : (
                    <Link
                      component={RouterLink}
                      to={PURCHASE_ORDER_ROUTES.detail(row.id)}
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
