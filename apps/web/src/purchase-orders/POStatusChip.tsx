import { Chip } from '@mui/material';
import { statusChipColor } from '@/workflow-timeline';
import { purchaseOrderStatusLabel } from './labels';

type Props = {
  status: string;
};

export function POStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      color={statusChipColor(status, 'purchaseOrder')}
      label={purchaseOrderStatusLabel(status)}
      data-testid="po-status-chip"
    />
  );
}
