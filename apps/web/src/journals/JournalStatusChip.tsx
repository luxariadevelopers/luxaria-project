import { Chip } from '@mui/material';
import { statusChipColor } from '@/workflow-timeline';
import { journalStatusLabel } from './labels';

type Props = {
  status: string;
};

export function JournalStatusChip({ status }: Props) {
  return (
    <Chip
      size="small"
      color={statusChipColor(status, 'journal')}
      label={journalStatusLabel(status)}
      data-testid="journal-status-chip"
    />
  );
}
