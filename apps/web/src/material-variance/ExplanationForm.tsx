import {
  Alert,
  Box,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { MaterialConsumptionLine } from './types';
import { DEFAULT_VARIANCE_THRESHOLD_PERCENT, lineNeedsExplanationEditor } from './validation';
import { lineLabel } from './labels';
import { EvidencePanel } from './EvidencePanel';

type ExplanationFormProps = {
  line: MaterialConsumptionLine | null;
  value: string;
  onChange: (value: string) => void;
  evidenceFiles: File[];
  onEvidenceChange: (files: File[]) => void;
  disabled?: boolean;
  error?: string | null;
  evidenceError?: string | null;
};

/**
 * Corrective action / variance explanation for lines requiring approval.
 * Maps to Nest `PATCH …/material-consumption-reports/:id` explanations[].
 */
export function ExplanationForm({
  line,
  value,
  onChange,
  evidenceFiles,
  onEvidenceChange,
  disabled,
  error,
  evidenceError,
}: ExplanationFormProps) {
  if (!line || !lineNeedsExplanationEditor(line)) {
    return (
      <Box
        sx={{
          p: 2,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography color="text.secondary">
          Select a line flagged for approval to add a variance explanation.
        </Typography>
      </Box>
    );
  }

  const aboveThreshold =
    Math.abs(line.varianceQuantity) > 1e-9 &&
    line.variancePercentage >= DEFAULT_VARIANCE_THRESHOLD_PERCENT - 1e-9;

  return (
    <Stack spacing={2} data-testid="explanation-form">
      <Typography variant="subtitle1">
        Variance explanation — {lineLabel(line)}
      </Typography>
      {aboveThreshold ? (
        <Alert severity="warning">
          Variance is at or above the {DEFAULT_VARIANCE_THRESHOLD_PERCENT}%
          threshold. Provide a detailed explanation
          {aboveThreshold ? ' and supporting evidence' : ''} before submit.
        </Alert>
      ) : null}
      <TextField
        label="Corrective action / explanation"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        multiline
        minRows={4}
        fullWidth
        required
        disabled={disabled}
        error={Boolean(error)}
        helperText={
          error ??
          'Required before submit when the line has material variance or alerts.'
        }
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
      <EvidencePanel
        line={line}
        files={evidenceFiles}
        onChange={onEvidenceChange}
        disabled={disabled}
        required={aboveThreshold}
        error={evidenceError}
      />
    </Stack>
  );
}
