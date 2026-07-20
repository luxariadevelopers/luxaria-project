import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { STOCK_TRANSACTION_TYPE_OPTIONS, stockTransactionTypeLabel } from './labels';
import type { StockLedgerFilterState, StockTransactionType } from './types';

type Props = {
  value: StockLedgerFilterState;
  fieldErrors?: Partial<Record<keyof StockLedgerFilterState, string>>;
  onChange: (next: StockLedgerFilterState) => void;
};

export function LedgerFilters({ value, fieldErrors, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="stock-ledger-filters"
    >
      <TextField
        size="small"
        label="Material id"
        value={value.materialId}
        error={Boolean(fieldErrors?.materialId)}
        helperText={fieldErrors?.materialId ?? 'Optional ObjectId'}
        onChange={(e) => onChange({ ...value, materialId: e.target.value })}
        sx={{ minWidth: 220 }}
      />
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="stock-ledger-type-label">Type</InputLabel>
        <Select
          labelId="stock-ledger-type-label"
          label="Type"
          value={value.transactionType}
          onChange={(e) =>
            onChange({
              ...value,
              transactionType: e.target.value as
                | ''
                | StockTransactionType,
            })
          }
        >
          <MenuItem value="">All types</MenuItem>
          {STOCK_TRANSACTION_TYPE_OPTIONS.map((type) => (
            <MenuItem key={type} value={type}>
              {stockTransactionTypeLabel(type)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Location"
        value={value.location}
        error={Boolean(fieldErrors?.location)}
        helperText={fieldErrors?.location}
        onChange={(e) => onChange({ ...value, location: e.target.value })}
        sx={{ minWidth: 160 }}
      />
      <TextField
        size="small"
        label="Batch"
        value={value.batch}
        error={Boolean(fieldErrors?.batch)}
        helperText={fieldErrors?.batch}
        onChange={(e) => onChange({ ...value, batch: e.target.value })}
        sx={{ minWidth: 140 }}
      />
      <TextField
        size="small"
        type="date"
        label="From"
        value={value.dateFrom}
        error={Boolean(fieldErrors?.dateFrom)}
        helperText={fieldErrors?.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        sx={{ minWidth: 150 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        type="date"
        label="To"
        value={value.dateTo}
        error={Boolean(fieldErrors?.dateTo)}
        helperText={fieldErrors?.dateTo}
        onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        sx={{ minWidth: 150 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    </Stack>
  );
}
