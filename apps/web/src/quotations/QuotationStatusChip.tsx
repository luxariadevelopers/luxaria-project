import { Chip } from '@mui/material';
import { quotationStatusLabel } from './labels';
import { VendorQuotationStatus } from './types';

type Props = {
  status: string;
};

export function QuotationStatusChip({ status }: Props) {
  const color =
    status === VendorQuotationStatus.Final
      ? 'success'
      : status === VendorQuotationStatus.Submitted
        ? 'info'
        : status === VendorQuotationStatus.Draft
          ? 'warning'
          : 'default';

  return (
    <Chip
      size="small"
      color={color}
      variant={status === VendorQuotationStatus.Final ? 'filled' : 'outlined'}
      label={quotationStatusLabel(status)}
      data-testid="quotation-status-chip"
    />
  );
}
