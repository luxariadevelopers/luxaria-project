import { Chip, Tooltip } from '@mui/material';
import { vendorStatusLabel } from './labels';
import { VendorStatus, type VendorListRow } from './types';

type Props = {
  row: Pick<VendorListRow, 'status' | 'blockReason'>;
};

export function VendorStatusChip({ row }: Props) {
  const blocked = row.status === VendorStatus.Blocked;
  const label = vendorStatusLabel(row.status);
  const chip = (
    <Chip
      size="small"
      label={label}
      color={
        row.status === VendorStatus.Active
          ? 'success'
          : blocked
            ? 'error'
            : row.status === VendorStatus.PendingVerification
              ? 'warning'
              : 'default'
      }
      variant={blocked ? 'filled' : 'outlined'}
      data-testid="vendor-status-chip"
      data-blocked={blocked ? 'true' : 'false'}
      data-status={row.status}
    />
  );

  if (blocked && row.blockReason) {
    return (
      <Tooltip title={row.blockReason} data-testid="vendor-block-reason">
        <span>{chip}</span>
      </Tooltip>
    );
  }
  return chip;
}
