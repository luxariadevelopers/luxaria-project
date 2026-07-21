import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { budgetStatusLabel } from './labels';
import { BudgetStatus, type BudgetStatus as Status } from './types';

export type BudgetFilterState = {
  financialYearId: string;
  status: Status | '';
};

type FyOption = { id: string; name: string };

type Props = {
  value: BudgetFilterState;
  onChange: (next: BudgetFilterState) => void;
  financialYears: readonly FyOption[];
  showFinancialYear?: boolean;
};

export function BudgetFilters({
  value,
  onChange,
  financialYears,
  showFinancialYear = true,
}: Props) {
  const patch = (partial: Partial<BudgetFilterState>) =>
    onChange({ ...value, ...partial });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {showFinancialYear ? (
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="budget-fy">Financial year</InputLabel>
          <Select
            labelId="budget-fy"
            label="Financial year"
            value={value.financialYearId}
            onChange={(e) => patch({ financialYearId: e.target.value })}
          >
            <MenuItem value="">
              <em>All years</em>
            </MenuItem>
            {financialYears.map((fy) => (
              <MenuItem key={fy.id} value={fy.id}>
                {fy.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="budget-status">Status</InputLabel>
        <Select
          labelId="budget-status"
          label="Status"
          value={value.status}
          onChange={(e) => patch({ status: e.target.value as Status | '' })}
        >
          <MenuItem value="">
            <em>All statuses</em>
          </MenuItem>
          {Object.values(BudgetStatus).map((status) => (
            <MenuItem key={status} value={status}>
              {budgetStatusLabel(status)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
