import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { formatInr } from '@/format';
import type { PaymentFormValues } from './validation';

type AllocationRow = PaymentFormValues['allocations'][number];

type Props = {
  control: Control<PaymentFormValues>;
  setValue: UseFormSetValue<PaymentFormValues>;
  allocations: readonly AllocationRow[];
  readOnly: boolean;
  editable: boolean;
  canViewRunningBills: boolean;
  contractorSelected: boolean;
  loading: boolean;
  emptyOnCreate: boolean;
};

/**
 * Bill allocation picker — amount cannot exceed remaining net payable.
 * Deep-link: `/contractors/running-bills` (parallel Micro Phase).
 */
export function BillAllocationEditor({
  control,
  setValue,
  allocations,
  readOnly,
  editable,
  canViewRunningBills,
  contractorSelected,
  loading,
  emptyOnCreate,
}: Props) {
  if (!canViewRunningBills) {
    return (
      <Alert severity="warning">
        Bill allocation requires running_bill.view.
      </Alert>
    );
  }

  if (!contractorSelected) {
    return (
      <Typography variant="body2" color="text.secondary">
        Select a contractor to load posted running bills.
      </Typography>
    );
  }

  if (loading) {
    return <Typography variant="body2">Loading running bills…</Typography>;
  }

  if (emptyOnCreate) {
    return (
      <Alert severity="info" data-testid="no-payable-bills">
        No posted running bills with remaining payable for this contractor.{' '}
        <Typography
          component={RouterLink}
          to="/contractors/running-bills"
          variant="body2"
          sx={{ color: 'inherit', fontWeight: 600 }}
        >
          Open running bills
        </Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={1} data-testid="bill-allocation-editor">
      {allocations.map((row, index) => (
        <Box
          key={row.billId}
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
          }}
        >
          <Controller
            name={`allocations.${index}.selected`}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    disabled={readOnly}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      if (e.target.checked) {
                        setValue(
                          `allocations.${index}.amount`,
                          row.remainingPayable,
                        );
                      } else {
                        setValue(`allocations.${index}.amount`, 0);
                      }
                    }}
                  />
                }
                label={`${row.billLabel} · payable ${formatInr(row.remainingPayable)}`}
              />
            )}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block' }}
          >
            Bill withholdings — retention {formatInr(row.billRetention)} ·
            advance {formatInr(row.billAdvanceRecovery)} · TDS{' '}
            {formatInr(row.billTds)}
          </Typography>
          <Controller
            name={`allocations.${index}.amount`}
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Allocate"
                type="number"
                size="small"
                fullWidth
                disabled={readOnly || !row.selected}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message}
                onChange={(e) => field.onChange(Number(e.target.value))}
                slotProps={{
                  htmlInput: {
                    'data-testid': `allocation-amount-${row.billId}`,
                  },
                }}
              />
            )}
          />
        </Box>
      ))}
      {editable ? (
        <Button
          size="small"
          onClick={() => {
            const sum = allocations
              .filter((a) => a.selected)
              .reduce((s, a) => s + a.amount, 0);
            setValue('amount', sum);
          }}
        >
          Set amount from allocations
        </Button>
      ) : null}
    </Stack>
  );
}
