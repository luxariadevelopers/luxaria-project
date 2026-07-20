import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import { getErrorMessage, isForbiddenError } from '@/api/errors';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { useNotify } from '@/components/NotificationProvider';
import {
  useDownloadBoqTemplate,
  useImportBoqExcel,
} from '../useBoq';
import type { BoqImportResult } from '../types';
import { ImportErrorGrid } from './ImportErrorGrid';
import { ImportSummary } from './ImportSummary';
import { parseBoqWorkbook } from './parseWorkbook';
import {
  validateBoqImport,
  type BoqImportValidationResult,
} from './validateImport';

const STEPS = [
  'Template',
  'Upload',
  'Validate',
  'Preview',
  'Commit',
] as const;

type Props = {
  projectId: string;
  onDone?: () => void;
};

/**
 * Step wizard: template → upload → validate → preview → commit.
 * Commit calls Nest `POST /boq/projects/:projectId/import` only when
 * client validation reports zero blocking errors.
 */
export function ImportWizard({ projectId, onDone }: Props) {
  const { success, error: notifyError } = useNotify();
  const download = useDownloadBoqTemplate();
  const commit = useImportBoqExcel(projectId);

  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] =
    useState<BoqImportValidationResult | null>(null);
  const [parseError, setParseError] = useState<unknown>(null);
  const [parsing, setParsing] = useState(false);
  const [commitResult, setCommitResult] = useState<BoqImportResult | null>(
    null,
  );

  const runValidate = async (target: File) => {
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parseBoqWorkbook(target);
      const result = validateBoqImport(parsed);
      setValidation(result);
      return result;
    } catch (err) {
      setParseError(err);
      setValidation(null);
      throw err;
    } finally {
      setParsing(false);
    }
  };

  const goNext = async () => {
    if (activeStep === 1) {
      if (!file) {
        notifyError('Choose an Excel file first');
        return;
      }
      try {
        await runValidate(file);
        setActiveStep(2);
      } catch (err) {
        notifyError(getErrorMessage(err, 'Could not parse Excel file'));
      }
      return;
    }
    if (activeStep === 2) {
      if (!validation?.canCommit) {
        notifyError('Resolve blocking validation errors before continuing');
        return;
      }
      setActiveStep(3);
      return;
    }
    if (activeStep === 3) {
      setActiveStep(4);
      return;
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleCommit = async () => {
    if (!file || !validation?.canCommit) {
      notifyError('Cannot commit until blocking errors are resolved');
      return;
    }
    try {
      const result = await commit.mutateAsync(file);
      setCommitResult(result);
      success(
        `Imported ${result.importedCount} BOQ item(s)` +
          (result.errorCount ? ` with ${result.errorCount} error(s)` : ''),
      );
      onDone?.();
    } catch (err) {
      if (isForbiddenError(err)) return;
      notifyError(getErrorMessage(err, 'BOQ import failed'));
    }
  };

  if (commit.error && isForbiddenError(commit.error)) {
    return (
      <PermissionDenied
        error={commit.error}
        title="BOQ import denied"
        message="You need boq.manage to import a BOQ Excel file."
      />
    );
  }

  return (
    <Stack spacing={2.5} data-testid="boq-import-wizard">
      <Stepper activeStep={activeStep} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 ? (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Download the Nest BOQ Excel template, fill hierarchy and item
            columns, then continue to upload.
          </Typography>
          <Box>
            <Button
              variant="contained"
              disabled={download.isPending}
              onClick={() => {
                download.mutate(undefined, {
                  onSuccess: (filename) =>
                    success(`Downloaded ${filename}`),
                  onError: (err) =>
                    notifyError(
                      getErrorMessage(err, 'Template download failed'),
                    ),
                });
              }}
            >
              {download.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Download template'
              )}
            </Button>
          </Box>
          {download.error && isForbiddenError(download.error) ? (
            <PermissionDenied
              error={download.error}
              title="Template denied"
              message="You need boq.view to download the import template."
            />
          ) : null}
        </Stack>
      ) : null}

      {activeStep === 1 ? (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Upload a completed `.xlsx` file. Nothing is written until the
            commit step.
          </Typography>
          <Button variant="outlined" component="label">
            {file ? file.name : 'Choose Excel file'}
            <input
              hidden
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                setFile(next);
                setValidation(null);
                setCommitResult(null);
                setParseError(null);
              }}
            />
          </Button>
        </Stack>
      ) : null}

      {activeStep === 2 ? (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Client validation checks required columns and duplicate BOQ codes
            before commit.
          </Typography>
          {parsing ? <CircularProgress size={28} /> : null}
          {parseError ? (
            <RetryPanel
              error={parseError}
              onRetry={() => {
                if (file) void runValidate(file);
              }}
              forceRetry
            />
          ) : null}
          {validation ? <ImportErrorGrid issues={validation.issues} /> : null}
          {validation && !validation.canCommit ? (
            <Alert severity="error">
              Commit is disabled until all blocking errors are resolved.
            </Alert>
          ) : null}
        </Stack>
      ) : null}

      {activeStep === 3 ? (
        <Stack spacing={1.5}>
          <ImportSummary validation={validation} />
          {validation && validation.rows.length > 0 ? (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                maxHeight: 280,
                overflow: 'auto',
                p: 1,
              }}
            >
              {validation.rows.slice(0, 50).map((row) => (
                <Typography key={row.rowNumber} variant="body2">
                  Row {row.rowNumber}: {row.boqCode || '(auto)'} —{' '}
                  {row.description}
                </Typography>
              ))}
              {validation.rows.length > 50 ? (
                <Typography variant="caption" color="text.secondary">
                  Showing first 50 of {validation.rows.length} rows.
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Stack>
      ) : null}

      {activeStep === 4 ? (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Commit uploads the file to{' '}
            <code>POST /boq/projects/:projectId/import</code> (
            <code>boq.manage</code>).
          </Typography>
          <ImportSummary validation={validation} commitResult={commitResult} />
          {commit.error && !isForbiddenError(commit.error) ? (
            <RetryPanel
              error={commit.error}
              onRetry={() => void handleCommit()}
              forceRetry
            />
          ) : null}
          <Box>
            <Button
              variant="contained"
              color="primary"
              disabled={
                !validation?.canCommit || commit.isPending || Boolean(commitResult)
              }
              onClick={() => void handleCommit()}
            >
              {commit.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Commit import'
              )}
            </Button>
          </Box>
        </Stack>
      ) : null}

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button
          disabled={activeStep === 0 || commit.isPending}
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {activeStep < STEPS.length - 1 ? (
          <Button
            variant="contained"
            disabled={
              parsing ||
              (activeStep === 1 && !file) ||
              (activeStep === 2 && !validation?.canCommit)
            }
            onClick={() => void goNext()}
          >
            Next
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
