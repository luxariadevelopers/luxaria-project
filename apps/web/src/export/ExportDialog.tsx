import { useEffect, useMemo, useState } from 'react';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied, RetryPanel } from '@/components/errors';
import { downloadBlob } from './downloadBlob';
import { ExportFieldSelection } from './ExportFieldSelection';
import {
  FINANCE_DASHBOARD_DEFAULT_HORIZON_DAYS,
  FINANCE_DASHBOARD_MAX_HORIZON_DAYS,
} from './constants';
import type { ExportDescriptor, ExportFormValues } from './types';
import {
  defaultExportFormValues,
  validateExportForm,
} from './validateExportForm';

export type ExportDialogProps = {
  open: boolean;
  onClose: () => void;
  descriptor: ExportDescriptor;
  /** Prefill project / dates from the parent page. */
  initialValues?: Partial<ExportFormValues>;
  onSuccess?: (info: {
    filename: string;
    contentType: string;
    values: ExportFormValues;
  }) => void;
};

/**
 * Reusable Excel/CSV (and report PDF) export dialog:
 * format, date range, required filters, field selection, progress.
 */
export function ExportDialog({
  open,
  onClose,
  descriptor,
  initialValues,
  onSuccess,
}: ExportDialogProps) {
  const { hasPermission } = useAuth();
  const canExport =
    !descriptor.permission || hasPermission(descriptor.permission);

  const [values, setValues] = useState<ExportFormValues>(() => ({
    ...defaultExportFormValues(descriptor),
    ...initialValues,
  }));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ExportFormValues, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues({
      ...defaultExportFormValues(descriptor),
      ...initialValues,
    });
    setFieldErrors({});
    setError(null);
    setLastFilename(null);
    setLoading(false);
    // Reset when the dialog opens or the export target changes — not on every
    // parent re-render of an inline `initialValues` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open, descriptor.id]);

  const filterFields = useMemo(() => {
    const map = new Map<string, { key: keyof ExportFormValues; label: string }>();
    for (const f of descriptor.requiredFilters ?? []) {
      map.set(f.key, f);
    }
    for (const f of descriptor.optionalFilters ?? []) {
      if (!map.has(f.key)) map.set(f.key, f);
    }
    return [...map.values()].filter(
      (f) =>
        f.key !== 'from' &&
        f.key !== 'to' &&
        f.key !== 'date' &&
        f.key !== 'horizonDays',
    );
  }, [descriptor]);

  const patch = <K extends keyof ExportFormValues>(
    key: K,
    value: ExportFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const runExport = async () => {
    setError(null);
    setLastFilename(null);
    if (!canExport) {
      setError({
        success: false,
        message: descriptor.permission
          ? `Missing permission ${descriptor.permission}`
          : 'Export not permitted',
      });
      return;
    }

    const validated = validateExportForm(descriptor, values);
    if (!validated.ok) {
      setFieldErrors(validated.fieldErrors ?? {});
      setError({ success: false, message: validated.message });
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await descriptor.fetchBinary(validated.values);
      downloadBlob(result.blob, result.filename);
      setLastFilename(result.filename);
      onSuccess?.({
        filename: result.filename,
        contentType: result.contentType,
        values: validated.values,
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{descriptor.title}</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {!canExport ? (
            <PermissionDenied
              message={
                descriptor.permission
                  ? `Missing permission ${descriptor.permission}`
                  : 'You cannot export this data.'
              }
              showHomeLink={false}
            />
          ) : null}

          {canExport ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Exports use backend binary responses when available. Filename and
                MIME are taken from response headers when CORS exposes them;
                otherwise a safe fallback name is used.
              </Typography>

              <FormControl fullWidth size="small" error={Boolean(fieldErrors.format)}>
                <InputLabel id="export-format-label">Format</InputLabel>
                <Select
                  labelId="export-format-label"
                  label="Format"
                  value={values.format}
                  disabled={loading}
                  onChange={(e) => {
                    patch('format', e.target.value as ExportFormValues['format']);
                  }}
                >
                  {descriptor.allowedFormats.map((fmt) => (
                    <MenuItem key={fmt} value={fmt}>
                      {fmt.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.format ? (
                  <FormHelperText>{fieldErrors.format}</FormHelperText>
                ) : null}
              </FormControl>

              {descriptor.showAsOfDate ? (
                <TextField
                  size="small"
                  type="date"
                  label="As-of date"
                  value={values.date}
                  disabled={loading}
                  onChange={(e) => {
                    patch('date', e.target.value);
                  }}
                  error={Boolean(fieldErrors.date)}
                  helperText={fieldErrors.date}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              ) : null}

              {descriptor.showDateRange ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    size="small"
                    type="date"
                    label="From"
                    fullWidth
                    value={values.from}
                    disabled={loading}
                    onChange={(e) => {
                      patch('from', e.target.value);
                    }}
                    error={Boolean(fieldErrors.from)}
                    helperText={fieldErrors.from}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="To"
                    fullWidth
                    value={values.to}
                    disabled={loading}
                    onChange={(e) => {
                      patch('to', e.target.value);
                    }}
                    error={Boolean(fieldErrors.to)}
                    helperText={
                      fieldErrors.to ??
                      (descriptor.maxRangeDays != null
                        ? `Max ${descriptor.maxRangeDays} days`
                        : 'from must be on or before to')
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              ) : null}

              {descriptor.showHorizonDays ? (
                <TextField
                  size="small"
                  type="number"
                  label="Horizon (days)"
                  value={values.horizonDays}
                  disabled={loading}
                  onChange={(e) => {
                    patch('horizonDays', e.target.value);
                  }}
                  error={Boolean(fieldErrors.horizonDays)}
                  helperText={
                    fieldErrors.horizonDays ??
                    `Optional · default ${FINANCE_DASHBOARD_DEFAULT_HORIZON_DAYS} · max ${FINANCE_DASHBOARD_MAX_HORIZON_DAYS}`
                  }
                  slotProps={{
                    htmlInput: {
                      min: 1,
                      max: FINANCE_DASHBOARD_MAX_HORIZON_DAYS,
                    },
                  }}
                />
              ) : null}

              {filterFields.map((filter) => (
                <TextField
                  key={filter.key}
                  size="small"
                  label={filter.label}
                  value={String(values[filter.key] ?? '')}
                  disabled={loading}
                  onChange={(e) => {
                    patch(filter.key, e.target.value);
                  }}
                  error={Boolean(fieldErrors[filter.key])}
                  helperText={fieldErrors[filter.key]}
                />
              ))}

              {descriptor.fields && descriptor.fields.length > 0 ? (
                <ExportFieldSelection
                  fields={descriptor.fields}
                  selectedIds={values.selectedFieldIds}
                  disabled={loading}
                  error={fieldErrors.selectedFieldIds}
                  onChange={(ids) => {
                    patch('selectedFieldIds', ids);
                  }}
                />
              ) : null}

              {lastFilename ? (
                <Alert severity="success" variant="outlined">
                  Downloaded <strong>{lastFilename}</strong>
                </Alert>
              ) : null}

              {error ? (
                <RetryPanel
                  error={error}
                  onRetry={() => {
                    void runExport();
                  }}
                  forceRetry
                />
              ) : null}
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <FileDownloadOutlinedIcon />
            )
          }
          disabled={!canExport || loading}
          onClick={() => {
            void runExport();
          }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
