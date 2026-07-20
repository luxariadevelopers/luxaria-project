import {
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { formatInr } from '@/format';
import type { BillAmounts } from './validation';

type Props = {
  amounts: BillAmounts;
  previousCertifiedValue?: number;
  cumulativeValue?: number;
  advanceRecovery: string;
  materialRecovery: string;
  retention: string;
  tds: string;
  penalty: string;
  otherDeductions: string;
  onChange: (field: DeductionField, value: string) => void;
  readOnly?: boolean;
};

export type DeductionField =
  | 'advanceRecovery'
  | 'materialRecovery'
  | 'retention'
  | 'tds'
  | 'penalty'
  | 'otherDeductions';

export function DeductionsPanel({
  amounts,
  previousCertifiedValue,
  cumulativeValue,
  advanceRecovery,
  materialRecovery,
  retention,
  tds,
  penalty,
  otherDeductions,
  onChange,
  readOnly,
}: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="deductions-panel">
      <Typography variant="subtitle2" gutterBottom>
        Deductions & payable
      </Typography>
      <Stack spacing={1.5}>
        {previousCertifiedValue != null ? (
          <Typography variant="body2" color="text.secondary">
            Previous certified: {formatInr(previousCertifiedValue)}
            {cumulativeValue != null
              ? ` · Cumulative: ${formatInr(cumulativeValue)}`
              : ''}
          </Typography>
        ) : null}
        <Typography variant="body2">
          Current certified:{' '}
          <strong data-testid="deductions-current">
            {formatInr(amounts.currentCertifiedValue)}
          </strong>
        </Typography>
        {!readOnly ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            {(
              [
                ['advanceRecovery', 'Advance recovery', advanceRecovery],
                ['materialRecovery', 'Material recovery', materialRecovery],
                ['retention', 'Retention', retention],
                ['tds', 'TDS', tds],
                ['penalty', 'Penalty', penalty],
                ['otherDeductions', 'Other deductions', otherDeductions],
              ] as const
            ).map(([field, label, value]) => (
              <TextField
                key={field}
                size="small"
                type="number"
                label={label}
                value={value}
                onChange={(e) => onChange(field, e.target.value)}
                sx={{ minWidth: 160 }}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: '0.01',
                    'data-testid': `deduction-${field}`,
                  },
                }}
              />
            ))}
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            <Typography variant="body2">
              Advance recovery: {formatInr(amounts.advanceRecovery)}
            </Typography>
            <Typography variant="body2">
              Material recovery: {formatInr(amounts.materialRecovery)}
            </Typography>
            <Typography variant="body2">
              Retention: {formatInr(amounts.retention)}
            </Typography>
            <Typography variant="body2">
              TDS: {formatInr(amounts.tds)}
            </Typography>
            <Typography variant="body2">
              Penalty: {formatInr(amounts.penalty)}
            </Typography>
            <Typography variant="body2">
              Other: {formatInr(amounts.otherDeductions)}
            </Typography>
          </Stack>
        )}
        <Typography variant="body2">
          Total deductions:{' '}
          <strong data-testid="deductions-total">
            {formatInr(amounts.totalDeductions)}
          </strong>
        </Typography>
        <Typography variant="subtitle1">
          Net payable:{' '}
          <strong data-testid="deductions-net">
            {formatInr(amounts.netPayable)}
          </strong>
        </Typography>
      </Stack>
    </Paper>
  );
}
