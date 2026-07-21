import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ErrorAlert } from '@/components/errors';
import { formatDate } from '@/format';
import { FinancialYearStatusChip } from './FinancialYearStatusChip';
import type { TransactionDateValidationResult } from './types';
import { useValidateFinancialYearTransactionDate } from './useFinancialYears';
import { transactionDateSchema } from './validation';

export function TransactionDateValidator({
  companyId,
}: {
  companyId?: string | null;
}) {
  const mutation = useValidateFinancialYearTransactionDate();
  const [transactionDate, setTransactionDate] = useState('');
  const [forPosting, setForPosting] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] =
    useState<TransactionDateValidationResult | null>(null);

  const submit = async () => {
    const parsed = transactionDateSchema.safeParse({
      transactionDate,
      forPosting,
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? 'Enter a transaction date',
      );
      return;
    }
    setValidationError(null);
    setResult(null);
    mutation.reset();
    try {
      const next = await mutation.mutateAsync({
        ...parsed.data,
        companyId,
      });
      setResult(next);
    } catch {
      // Mutation error is rendered below with the shared API error model.
    }
  };

  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: 2 }}
      data-testid="transaction-date-validator"
    >
      <Stack spacing={1.5}>
        <Stack spacing={0.25}>
          <Typography variant="h6">Transaction date check</Typography>
          <Typography variant="body2" color="text.secondary">
            Check whether a date belongs to a financial year and, optionally,
            whether accounting posting is currently allowed.
          </Typography>
        </Stack>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'flex-start' } }}
        >
          <TextField
            label="Transaction date"
            type="date"
            value={transactionDate}
            onChange={(event) => {
              setTransactionDate(event.target.value);
              setValidationError(null);
              setResult(null);
            }}
            error={Boolean(validationError)}
            helperText={validationError}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 220 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={forPosting}
                onChange={(_, checked) => {
                  setForPosting(checked);
                  setResult(null);
                }}
              />
            }
            label="Validate for accounting posting"
            sx={{ minHeight: 40 }}
          />
          <Button
            variant="outlined"
            onClick={() => void submit()}
            disabled={mutation.isPending}
            sx={{ minHeight: 40 }}
          >
            {mutation.isPending ? 'Checking…' : 'Check date'}
          </Button>
        </Stack>

        {mutation.error ? (
          <ErrorAlert
            error={mutation.error}
            title="Date validation could not be completed"
          />
        ) : null}

        {result ? (
          <Alert
            severity={result.valid ? 'success' : 'error'}
            variant="outlined"
          >
            <Stack spacing={0.75}>
              <Typography variant="body2">
                {result.valid
                  ? `The date ${formatDate(transactionDate)} is valid${result.forPosting ? ' for posting' : ''}.`
                  : result.reason || 'This transaction date is not valid.'}
              </Typography>
              {result.financialYear ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Typography variant="body2">
                    {result.financialYear.name} ·{' '}
                    {formatDate(result.financialYear.startDate)} –{' '}
                    {formatDate(result.financialYear.endDate)}
                  </Typography>
                  <FinancialYearStatusChip
                    financialYear={result.financialYear}
                  />
                </Stack>
              ) : null}
            </Stack>
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
