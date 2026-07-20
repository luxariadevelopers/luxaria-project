import { Chip } from '@mui/material';
import { grnStatusLabel } from './labels';
import { GoodsReceiptStatus } from './types';

type Props = {
  status: string;
};

export function GrnStatusChip({ status }: Props) {
  const color =
    status === GoodsReceiptStatus.Posted ||
    status === GoodsReceiptStatus.Accepted
      ? 'success'
      : status === GoodsReceiptStatus.PartiallyAccepted ||
          status === GoodsReceiptStatus.QualityCheck
        ? 'warning'
        : status === GoodsReceiptStatus.Submitted
          ? 'info'
          : status === GoodsReceiptStatus.Rejected
            ? 'error'
            : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === GoodsReceiptStatus.Posted ? 'filled' : 'outlined'
      }
      label={grnStatusLabel(status)}
      data-testid="grn-status-chip"
      data-status={status}
    />
  );
}
