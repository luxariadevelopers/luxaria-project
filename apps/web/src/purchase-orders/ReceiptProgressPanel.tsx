import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatInr, formatQuantity } from '@/format';
import { receiptProgressPercent } from './compareRevisions';
import { materialUnitLabel } from './labels';
import { computeReceivedAmount } from './receivedValue';
import type { PublicPurchaseOrder } from './types';

type Props = {
  po: PublicPurchaseOrder;
};

/**
 * Receipt progress from PO line receivedQuantity / balance fields.
 * GRN create UI is out of scope for Phase 067 — this is read-only traceability.
 */
export function ReceiptProgressPanel({ po }: Props) {
  const orderedQty = po.items.reduce((sum, i) => sum + i.quantity, 0);
  const receivedQty = po.items.reduce(
    (sum, i) => sum + i.receivedQuantity,
    0,
  );
  const pct = receiptProgressPercent(orderedQty, receivedQty);
  const receivedAmount = computeReceivedAmount(po.total, po.balanceAmount);

  return (
    <Stack spacing={2} data-testid="po-receipt-progress">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Receipt progress
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            Qty {formatQuantity(receivedQty)} / {formatQuantity(orderedQty)} (
            {pct}%)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Value received {formatInr(receivedAmount)} · open balance{' '}
            {formatInr(po.balanceAmount)}
          </Typography>
        </Stack>
        <Box sx={{ width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={pct >= 100 ? 'success' : pct > 0 ? 'warning' : 'inherit'}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Line receipts
        </Typography>
        {po.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No line items on this purchase order.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Material</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Ordered</TableCell>
                <TableCell align="right">Received</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">%</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {po.items.map((item) => {
                const linePct = receiptProgressPercent(
                  item.quantity,
                  item.receivedQuantity,
                );
                return (
                  <TableRow key={item.id || item.materialId}>
                    <TableCell>
                      {[item.materialCode, item.materialName]
                        .filter(Boolean)
                        .join(' · ') || item.materialId}
                    </TableCell>
                    <TableCell>{materialUnitLabel(String(item.unit))}</TableCell>
                    <TableCell align="right">
                      {formatQuantity(item.quantity)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQuantity(item.receivedQuantity)}
                    </TableCell>
                    <TableCell align="right">
                      {formatQuantity(item.balanceQuantity)}
                    </TableCell>
                    <TableCell align="right">{linePct}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
