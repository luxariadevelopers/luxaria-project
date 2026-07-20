import { Chip, Tooltip } from '@mui/material';
import { isLowStock, lowStockReason } from './lowStock';
import type { StockBalanceRow } from './types';

type Props = {
  row: Pick<
    StockBalanceRow,
    'quantityInBaseUnit' | 'reorderLevel' | 'minimumStock' | 'alerts'
  >;
};

export function LowStockIndicator({ row }: Props) {
  if (!isLowStock(row)) {
    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        label="OK"
        data-testid="stock-ok-chip"
      />
    );
  }

  const reason = lowStockReason(row) ?? 'Low stock';
  return (
    <Tooltip title={reason}>
      <Chip
        size="small"
        color="warning"
        label="Low"
        data-testid="stock-low-chip"
      />
    </Tooltip>
  );
}
