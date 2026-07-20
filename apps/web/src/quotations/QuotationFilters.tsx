import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { VendorQuotationStatus } from './types';
import { quotationStatusLabel } from './labels';

export type QuotationFilterState = {
  status: '' | VendorQuotationStatus;
  purchaseRequestId: string;
};

type Props = {
  value: QuotationFilterState;
  onChange: (next: QuotationFilterState) => void;
};

const STATUS_OPTIONS: Array<'' | VendorQuotationStatus> = [
  '',
  VendorQuotationStatus.Draft,
  VendorQuotationStatus.Submitted,
  VendorQuotationStatus.Final,
  VendorQuotationStatus.Superseded,
  VendorQuotationStatus.Cancelled,
];

export function QuotationFilters({ value, onChange }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: 'wrap', alignItems: { sm: 'center' } }}
      data-testid="quotation-filters"
    >
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="quotation-status-filter">Status</InputLabel>
        <Select
          labelId="quotation-status-filter"
          label="Status"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as QuotationFilterState['status'],
            })
          }
        >
          {STATUS_OPTIONS.map((status) => (
            <MenuItem key={status || 'all'} value={status}>
              {status ? quotationStatusLabel(status) : 'All statuses'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Purchase request id"
        value={value.purchaseRequestId}
        onChange={(e) =>
          onChange({ ...value, purchaseRequestId: e.target.value })
        }
        sx={{ minWidth: 220 }}
      />
    </Stack>
  );
}
