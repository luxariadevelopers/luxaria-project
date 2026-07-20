import { Chip } from '@mui/material';
import { transferStatusLabel } from './labels';
import { PettyCashFundTransferStatus } from './types';

type Props = {
  status: string;
};

export function TransferStatusChip({ status }: Props) {
  const color =
    status === PettyCashFundTransferStatus.Posted
      ? 'success'
      : status === PettyCashFundTransferStatus.Verified
        ? 'info'
        : status === PettyCashFundTransferStatus.Cancelled
          ? 'default'
          : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={
        status === PettyCashFundTransferStatus.Posted ? 'filled' : 'outlined'
      }
      label={transferStatusLabel(status)}
      data-testid="petty-cash-transfer-status-chip"
      data-status={status}
    />
  );
}
