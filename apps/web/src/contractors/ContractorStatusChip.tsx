import { Chip } from '@mui/material';
import { contractorStatusLabel } from './labels';
import { ContractorStatus, type ContractorListRow } from './types';
import { contractorUiState } from './contractorStatus';

export function ContractorStatusChip({ row }: { row: ContractorListRow }) {
  const blocked = contractorUiState(row).isBlocked;
  const color =
    row.status === ContractorStatus.Active
      ? 'success'
      : blocked
        ? 'default'
        : 'warning';
  return (
    <Chip
      size="small"
      label={contractorStatusLabel(row.status)}
      color={color}
      variant={blocked ? 'filled' : 'outlined'}
      data-testid="contractor-status-chip"
    />
  );
}
