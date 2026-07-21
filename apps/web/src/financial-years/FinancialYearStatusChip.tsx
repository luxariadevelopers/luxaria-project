import { Chip, Stack } from '@mui/material';
import { FinancialYearStatus, type PublicFinancialYear } from './types';

export function FinancialYearStatusChip({
  financialYear,
}: {
  financialYear: PublicFinancialYear;
}) {
  const color =
    financialYear.status === FinancialYearStatus.Open
      ? 'success'
      : financialYear.status === FinancialYearStatus.Locked
        ? 'warning'
        : 'default';

  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <Chip
        size="small"
        color={color}
        variant="outlined"
        label={
          financialYear.status.charAt(0).toUpperCase() +
          financialYear.status.slice(1)
        }
      />
      {financialYear.isCurrent ? (
        <Chip size="small" color="primary" label="Current" />
      ) : null}
      {financialYear.isLocked &&
      financialYear.status !== FinancialYearStatus.Locked ? (
        <Chip size="small" color="warning" label="Locked" />
      ) : null}
    </Stack>
  );
}
