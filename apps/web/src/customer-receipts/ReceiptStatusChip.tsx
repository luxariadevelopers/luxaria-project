import { Chip } from '@mui/material';
import { receiptStatusLabel } from './labels';
import { CustomerReceiptStatus } from './types';

const COLOR: Record<
  CustomerReceiptStatus,
  'default' | 'warning' | 'success' | 'error'
> = {
  [CustomerReceiptStatus.Draft]: 'warning',
  [CustomerReceiptStatus.Posted]: 'success',
  [CustomerReceiptStatus.Cancelled]: 'default',
};

type Props = {
  status: string;
};

export function ReceiptStatusChip({ status }: Props) {
  const key = status as CustomerReceiptStatus;
  return (
    <Chip
      size="small"
      label={receiptStatusLabel(status)}
      color={COLOR[key] ?? 'default'}
      variant="outlined"
    />
  );
}
