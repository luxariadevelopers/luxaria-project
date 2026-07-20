import type { ReactNode } from 'react';
import {
  Alert,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type {
  PublicGoodsReceiptItem,
  PurchaseOrderForCompare,
} from './types';

type Props = {
  grnItems: readonly PublicGoodsReceiptItem[];
  purchaseOrder: PurchaseOrderForCompare | undefined;
  loading?: boolean;
  error?: unknown;
  canViewPo: boolean;
};

function materialLabel(item: {
  materialCode: string | null;
  materialName: string | null;
  materialId: string;
}): string {
  if (item.materialCode && item.materialName) {
    return `${item.materialCode} · ${item.materialName}`;
  }
  return item.materialName || item.materialCode || item.materialId;
}

/**
 * Side-by-side GRN line vs PO ordered / cumulative received / balance.
 */
export function GrnPoComparison({
  grnItems,
  purchaseOrder,
  loading,
  error,
  canViewPo,
}: Props) {
  if (!canViewPo) {
    return (
      <Alert severity="info" data-testid="grn-po-comparison-denied">
        PO comparison needs the purchase.view permission.
      </Alert>
    );
  }

  if (loading) {
    return (
      <BoxCenter>
        <CircularProgress size={24} />
      </BoxCenter>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" data-testid="grn-po-comparison-error">
        Could not load purchase order for comparison.
      </Alert>
    );
  }

  if (!purchaseOrder) {
    return (
      <Typography color="text.secondary">Purchase order unavailable.</Typography>
    );
  }

  const poByLine = new Map(
    purchaseOrder.items.map((line) => [line.id, line]),
  );

  return (
    <Stack spacing={1.5} data-testid="grn-po-comparison">
      <Typography variant="body2" color="text.secondary">
        PO <strong>{purchaseOrder.purchaseOrderNumber}</strong>
        {' · '}
        status {purchaseOrder.status}
        {' · '}
        balance qty {purchaseOrder.balanceQuantity}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Material</TableCell>
            <TableCell align="right">PO ordered</TableCell>
            <TableCell align="right">PO received (cum.)</TableCell>
            <TableCell align="right">PO balance</TableCell>
            <TableCell align="right">GRN ordered</TableCell>
            <TableCell align="right">GRN received</TableCell>
            <TableCell align="right">GRN accepted</TableCell>
            <TableCell align="right">GRN rejected</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {grnItems.map((item) => {
            const poLine = item.purchaseOrderLineId
              ? poByLine.get(item.purchaseOrderLineId)
              : undefined;
            return (
              <TableRow key={item.id}>
                <TableCell>{materialLabel(item)}</TableCell>
                <TableCell align="right">
                  {poLine ? poLine.quantity : '—'}
                </TableCell>
                <TableCell align="right">
                  {poLine ? poLine.receivedQuantity : '—'}
                </TableCell>
                <TableCell align="right">
                  {poLine ? poLine.balanceQuantity : '—'}
                </TableCell>
                <TableCell align="right">{item.orderedQuantity}</TableCell>
                <TableCell align="right">{item.receivedQuantity}</TableCell>
                <TableCell align="right">
                  {item.acceptedQuantity ?? '—'}
                </TableCell>
                <TableCell align="right">
                  {item.rejectedQuantity ?? '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Stack>
  );
}

function BoxCenter({ children }: { children: ReactNode }) {
  return (
    <Stack sx={{ alignItems: 'center', py: 2 }}>
      {children}
    </Stack>
  );
}
