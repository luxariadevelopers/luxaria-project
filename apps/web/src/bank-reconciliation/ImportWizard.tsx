import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { FileUpload } from '@/components/FileUpload';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { COLUMN_MAPPING_FIELDS } from './labels';
import {
  previewCsvStatement,
  readCsvHeaders,
  suggestColumnMapping,
  type ParsedPreviewRow,
} from './parseStatement';
import type { StatementColumnMapping } from './types';
import { useImportBankStatement } from './useBankReconciliation';
import {
  duplicateImportMessage,
  validateColumnMapping,
  validateStatementFile,
} from './validation';

type Props = {
  sessionId: string;
  existingLineCount: number;
  savedMapping?: StatementColumnMapping | null;
  disabled?: boolean;
  onImported?: () => void;
};

const STEPS = ['Upload file', 'Map columns', 'Preview & import'] as const;

export function ImportWizard({
  sessionId,
  existingLineCount,
  savedMapping,
  disabled,
  onImported,
}: Props) {
  const importMutation = useImportBankStatement(sessionId);
  const { success, error: notifyError } = useNotify();
  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [mapping, setMapping] = useState<Partial<StatementColumnMapping>>(
    savedMapping ?? {},
  );
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [preview, setPreview] = useState<ParsedPreviewRow[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const duplicateWarning = duplicateImportMessage(existingLineCount);
  const file = files[0] ?? null;
  const isCsv =
    file != null &&
    (file.name.toLowerCase().endsWith('.csv') ||
      file.name.toLowerCase().endsWith('.txt'));

  const headerOptions = useMemo(
    () => [{ value: '', label: '— Not mapped —' }, ...headers.map((h) => ({ value: h, label: h }))],
    [headers],
  );

  const loadFile = async (nextFiles: File[]) => {
    setFiles(nextFiles);
    setLocalError(null);
    setPreview(null);
    setPreviewError(null);
    setCsvText(null);
    setHeaders([]);
    const validated = validateStatementFile(nextFiles[0]);
    if (!validated.ok) {
      setLocalError(validated.message);
      return;
    }
    const lower = validated.file.name.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
      const text = await validated.file.text();
      setCsvText(text);
      const hdrs = readCsvHeaders(text);
      setHeaders(hdrs);
      setMapping((prev) => ({
        ...suggestColumnMapping(hdrs),
        ...savedMapping,
        ...prev,
      }));
    } else {
      // XLS/XLSX — Nest parses; client only validates mapping fields.
      setHeaders([]);
      setMapping((prev) => ({ ...(savedMapping ?? {}), ...prev }));
    }
  };

  const goMap = () => {
    const validated = validateStatementFile(file);
    if (!validated.ok) {
      setLocalError(validated.message);
      return;
    }
    setLocalError(null);
    setActiveStep(1);
  };

  const goPreview = () => {
    const mapped = validateColumnMapping(mapping);
    if (!mapped.ok) {
      setLocalError(mapped.message);
      return;
    }
    setMapping(mapped.mapping);
    setLocalError(null);
    if (isCsv && csvText) {
      try {
        const result = previewCsvStatement(csvText, mapped.mapping);
        setPreview(result.rows);
        setPreviewError(null);
      } catch (err) {
        setPreview(null);
        setPreviewError(getErrorMessage(err));
        return;
      }
    } else {
      setPreview(null);
      setPreviewError(null);
    }
    setActiveStep(2);
  };

  const runImport = async () => {
    const fileCheck = validateStatementFile(file);
    if (!fileCheck.ok) {
      setLocalError(fileCheck.message);
      return;
    }
    const mapped = validateColumnMapping(mapping);
    if (!mapped.ok) {
      setLocalError(mapped.message);
      return;
    }
    if (existingLineCount > 0 && !replaceExisting) {
      setLocalError(duplicateWarning ?? 'Enable replace to re-import');
      return;
    }
    try {
      const result = await importMutation.mutateAsync({
        file: fileCheck.file,
        columnMapping: mapped.mapping,
        replaceExisting: existingLineCount > 0 ? replaceExisting : false,
      });
      success(`Imported ${result.importedCount} statement lines`);
      onImported?.();
      setActiveStep(0);
      setFiles([]);
      setPreview(null);
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const setField = (key: keyof StatementColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [key]: value || undefined }));
  };

  return (
    <Box data-testid="bank-recon-import-wizard">
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Import bank statement
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {localError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {localError}
        </Alert>
      ) : null}
      {duplicateWarning && existingLineCount > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {duplicateWarning}
        </Alert>
      ) : null}

      {activeStep === 0 ? (
        <Stack spacing={2}>
          <FileUpload
            label="Choose CSV / Excel"
            accept=".csv,.txt,.xls,.xlsx"
            maxSizeMb={10}
            disabled={disabled}
            value={files}
            onChange={(next) => void loadFile(next)}
            helperText="Nest accepts CSV, TXT, XLS, XLSX up to 10 MB."
          />
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={goMap} disabled={disabled || !file}>
              Next
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {activeStep === 1 ? (
        <Stack spacing={2}>
          {!isCsv ? (
            <Alert severity="info">
              Excel files are parsed on the server. Enter exact header names from
              the first sheet row.
            </Alert>
          ) : null}
          <Stack spacing={1.5}>
            {COLUMN_MAPPING_FIELDS.map((field) => (
              <TextField
                key={field.key}
                select={headers.length > 0}
                label={`${field.label}${field.required ? ' *' : ''}`}
                value={mapping[field.key] ?? ''}
                onChange={(e) =>
                  setField(field.key as keyof StatementColumnMapping, e.target.value)
                }
                disabled={disabled}
                fullWidth
                size="small"
              >
                {headers.length > 0
                  ? headerOptions.map((opt) => (
                      <MenuItem key={`${field.key}-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))
                  : null}
              </TextField>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => setActiveStep(0)}>Back</Button>
            <Button variant="contained" onClick={goPreview} disabled={disabled}>
              Next
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {activeStep === 2 ? (
        <Stack spacing={2}>
          {previewError ? <Alert severity="error">{previewError}</Alert> : null}
          {preview ? (
            <Alert severity="success">
              Preview: {preview.length} lines ready
              {preview.slice(0, 3).map((row) => (
                <Typography
                  key={row.lineNumber}
                  variant="caption"
                  sx={{ display: 'block' }}
                >
                  #{row.lineNumber} {row.description || '—'} · Dr{' '}
                  {formatInr(row.debit)} / Cr {formatInr(row.credit)}
                </Typography>
              ))}
            </Alert>
          ) : (
            <Alert severity="info">
              Client preview is available for CSV/TXT. XLS/XLSX will be parsed by
              Nest on import.
            </Alert>
          )}
          {existingLineCount > 0 ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Replace existing imported lines (required for re-import)"
            />
          ) : null}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => setActiveStep(1)} disabled={importMutation.isPending}>
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => void runImport()}
              disabled={disabled || importMutation.isPending}
            >
              Import
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Box>
  );
}
