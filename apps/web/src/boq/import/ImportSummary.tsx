import { Alert, Stack, Typography } from '@mui/material';
import { formatIndianNumber, formatInr } from '@/format';
import type { BoqImportResult } from '../types';
import type { BoqImportValidationResult } from './validateImport';

type Props = {
  validation: BoqImportValidationResult | null;
  commitResult?: BoqImportResult | null;
};

export function ImportSummary({ validation, commitResult }: Props) {
  if (!validation && !commitResult) return null;

  return (
    <Stack spacing={1.5} data-testid="boq-import-summary">
      {validation ? (
        <>
          <Typography variant="subtitle2">Preview summary</Typography>
          <Typography variant="body2">
            Rows: {formatIndianNumber(validation.summary.rowCount)} · Unique
            codes: {formatIndianNumber(validation.summary.uniqueBoqCodes)} ·
            Planned value (when provided):{' '}
            {formatInr(validation.summary.plannedValueSum)}
          </Typography>
          {validation.canCommit ? (
            <Alert severity="success">
              Validation passed. You can commit the import.
            </Alert>
          ) : (
            <Alert severity="error">
              Resolve {validation.blockingCount} blocking issue(s) before
              commit.
            </Alert>
          )}
        </>
      ) : null}

      {commitResult ? (
        <>
          <Typography variant="subtitle2">Import result</Typography>
          <Alert
            severity={commitResult.errorCount > 0 ? 'warning' : 'success'}
          >
            Imported {formatIndianNumber(commitResult.importedCount)} item(s)
            {commitResult.errorCount > 0
              ? ` with ${formatIndianNumber(commitResult.errorCount)} server error(s)`
              : ''}
            .
          </Alert>
          {commitResult.errors.length > 0 ? (
            <Stack spacing={0.5}>
              {commitResult.errors.map((err) => (
                <Typography key={`${err.rowNumber}-${err.message}`} variant="body2">
                  Row {err.rowNumber}: {err.message}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </>
      ) : null}
    </Stack>
  );
}
