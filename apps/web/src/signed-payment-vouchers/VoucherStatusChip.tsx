import { Chip } from '@mui/material';
import { getDomainStatusDisplay } from '@/status';
import { statusChipColor } from '@/workflow-timeline/badgeColor';
import { signedPaymentVoucherStatusLabel } from './labels';

type Props = {
  status: string;
};

export function VoucherStatusChip({ status }: Props) {
  const display = getDomainStatusDisplay(
    'signedPaymentVoucher',
    status,
    status,
  );

  return (
    <Chip
      size="small"
      color={statusChipColor(status, 'signedPaymentVoucher')}
      variant={display.known ? 'filled' : 'outlined'}
      label={signedPaymentVoucherStatusLabel(status)}
      data-testid="signed-voucher-status-chip"
    />
  );
}
