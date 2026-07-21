import { Chip } from '@mui/material';
import { contractorStatusLabel } from './labels';
import { ContractorStatus, type ContractorListRow } from './types';
import { contractorUiState } from './contractorStatus';

export function ContractorStatusChip({ row }: { row: ContractorListRow }) {
  const ui = contractorUiState(row);
  const color =
    row.status === ContractorStatus.Active
      ? 'success'
      : ui.isBlocked
        ? 'default'
        : ui.isSuspended
          ? 'warning'
          : 'warning';
  return (
    <Chip
      size="small"
      label={contractorStatusLabel(row.status)}
      color={color}
      variant={ui.isBlocked || ui.isSuspended ? 'filled' : 'outlined'}
      data-testid="contractor-status-chip"
    />
  );
}
