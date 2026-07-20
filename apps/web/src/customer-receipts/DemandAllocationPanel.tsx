import {
  Alert,
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { computeAllocationTotals } from './allocation';
import { formatInr } from './labels';
import type { AllocatableDemand } from './types';

export type AllocationLineState = {
  demandId: string;
  amount: number;
};

type Props = {
  receiptAmount: number;
  demands: readonly AllocatableDemand[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  value: AllocationLineState[];
  onChange: (next: AllocationLineState[]) => void;
};

export function DemandAllocationPanel({
  receiptAmount,
  demands,
  loading,
  error,
  onRetry,
  value,
  onChange,
}: Props) {
  const amountByDemand = new Map(
    value.map((line) => [line.demandId, line.amount]),
  );

  const active = demands
    .map((d) => ({
      demandId: d.demandId,
      amount: amountByDemand.get(d.demandId) ?? 0,
    }))
    .filter((line) => line.amount > 0);

  const totals = computeAllocationTotals({
    amount: receiptAmount > 0 ? receiptAmount : 0.01,
    allocations: active,
  });

  const setAmount = (demandId: string, raw: string) => {
    const parsed = Number(raw);
    const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const nextMap = new Map(amountByDemand);
    if (amount <= 0) {
      nextMap.delete(demandId);
    } else {
      nextMap.set(demandId, amount);
    }
    onChange(
      [...nextMap.entries()].map(([id, amt]) => ({
        demandId: id,
        amount: amt,
      })),
    );
  };

  return (
    <Stack spacing={1.5} data-testid="demand-allocation-panel">
      <Typography variant="subtitle2">Demand allocation</Typography>
      <Typography variant="body2" color="text.secondary">
        Allocate against open payment demands. Any remainder posts as
        unallocated customer advance.
      </Typography>

      {error ? (
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Box
                component="button"
                type="button"
                onClick={onRetry}
                sx={{
                  border: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                Retry
              </Box>
            ) : undefined
          }
        >
          Failed to load demands for this booking.
        </Alert>
      ) : null}

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading demands…
        </Typography>
      ) : null}

      {!loading && !error && demands.length === 0 ? (
        <Alert severity="info" variant="outlined">
          No open demands on the active schedule. Receipt can still be saved —
          full amount becomes unallocated advance.
        </Alert>
      ) : null}

      {demands.map((demand) => (
        <Stack
          key={demand.demandId}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">{demand.milestone}</Typography>
            <Typography variant="caption" color="text.secondary">
              Remaining {formatInr(demand.remainingAmount)}
              {demand.dueDate ? ` · due ${demand.dueDate.slice(0, 10)}` : ''}
            </Typography>
          </Box>
          <TextField
            size="small"
            type="number"
            label="Allocate"
            value={amountByDemand.get(demand.demandId) ?? ''}
            onChange={(e) => setAmount(demand.demandId, e.target.value)}
            slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            sx={{ width: { xs: '100%', sm: 160 } }}
          />
        </Stack>
      ))}

      {totals.ok ? (
        <Alert
          severity={totals.unallocatedAmount > 0 ? 'info' : 'success'}
          data-testid="allocation-totals"
        >
          Allocated {formatInr(totals.allocatedAmount)}
          {totals.unallocatedAmount > 0
            ? ` · unallocated advance ${formatInr(totals.unallocatedAmount)}`
            : ' · fully allocated'}
        </Alert>
      ) : (
        <Alert severity="error" data-testid="allocation-error">
          {totals.message}
        </Alert>
      )}
    </Stack>
  );
}
