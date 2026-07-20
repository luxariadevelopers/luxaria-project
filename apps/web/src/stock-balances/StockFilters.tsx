import {
  FormControlLabel,
  FormHelperText,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { StockBalanceFilterState } from './types';

type Props = {
  value: StockBalanceFilterState;
  onChange: (next: StockBalanceFilterState) => void;
  fieldErrors?: Partial<Record<keyof StockBalanceFilterState, string>>;
};

/**
 * Project comes from the shell header (`ProjectRequiredRoute`).
 * Location maps to Nest `GET /stock-ledger/balance?location=`.
 */
export function StockFilters({ value, onChange, fieldErrors = {} }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="stock-balance-filters"
    >
      <TextField
        size="small"
        label="Location"
        placeholder="All locations"
        value={value.location}
        onChange={(e) => onChange({ ...value, location: e.target.value })}
        error={Boolean(fieldErrors.location)}
        helperText={
          fieldErrors.location ??
          'Optional store/yard. Empty = on-hand across all locations.'
        }
        sx={{ minWidth: 200 }}
        slotProps={{
          htmlInput: {
            maxLength: 120,
            'data-testid': 'stock-location-filter',
          },
        }}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={value.lowStockOnly}
            onChange={(e) =>
              onChange({ ...value, lowStockOnly: e.target.checked })
            }
            slotProps={{
              input: { 'aria-label': 'Low stock only' },
            }}
          />
        }
        label="Low stock only"
      />
      {fieldErrors.search ? (
        <FormHelperText error>{fieldErrors.search}</FormHelperText>
      ) : null}
    </Stack>
  );
}
