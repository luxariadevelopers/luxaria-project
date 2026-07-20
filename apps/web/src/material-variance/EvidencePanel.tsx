import { Alert, Stack, Typography } from '@mui/material';
import { FileUpload } from '@/components/FileUpload';
import type { MaterialConsumptionLine } from './types';
import { lineLabel } from './labels';

type EvidencePanelProps = {
  line: MaterialConsumptionLine;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string | null;
};

/**
 * Supporting evidence for variance lines above threshold.
 * Files are kept client-side; reference filenames in the explanation or upload
 * via Documents module separately — Nest MCR DTO has no evidence field.
 */
export function EvidencePanel({
  line,
  files,
  onChange,
  disabled,
  required,
  error,
}: EvidencePanelProps) {
  return (
    <Stack spacing={1} data-testid="evidence-panel">
      <Typography variant="subtitle2">
        Supporting evidence{required ? ' (required)' : ''}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Attach site photos, weighbridge slips, or stock count sheets for{' '}
        {lineLabel(line)}. Filenames are appended to your explanation on save.
      </Typography>
      <FileUpload
        label="Attach evidence"
        accept="image/*,.pdf,.csv,.xlsx"
        multiple
        disabled={disabled}
        value={files}
        onChange={onChange}
        helperText="Max 25 MB per file. Upload permanent copies via Documents if needed."
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}
