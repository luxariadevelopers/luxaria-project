import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { QualityTestParameter } from './types';

export type ParameterGridRow = {
  name: string;
  expectedValue: string;
  actualValue: string;
  unit: string;
  passed: boolean | null;
  notes: string;
};

type Props = {
  value: ParameterGridRow[];
  onChange: (next: ParameterGridRow[]) => void;
  readOnly?: boolean;
  title?: string;
};

export function toParameterGridRows(
  params: readonly QualityTestParameter[],
): ParameterGridRow[] {
  return params.map((p) => ({
    name: p.name,
    expectedValue: p.expectedValue ?? '',
    actualValue: p.actualValue ?? '',
    unit: p.unit ?? '',
    passed: p.passed,
    notes: p.notes ?? '',
  }));
}

export function fromParameterGridRows(
  rows: readonly ParameterGridRow[],
): QualityTestParameter[] {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      expectedValue: r.expectedValue.trim() || null,
      actualValue: r.actualValue.trim() || null,
      unit: r.unit.trim() || null,
      passed: r.passed,
      notes: r.notes.trim() || null,
    }));
}

const emptyRow = (): ParameterGridRow => ({
  name: '',
  expectedValue: '',
  actualValue: '',
  unit: '',
  passed: null,
  notes: '',
});

/**
 * Editable grid for Nest `testParameters` on create / update / complete.
 */
export function ParameterGrid({
  value,
  onChange,
  readOnly = false,
  title = 'Test parameters',
}: Props) {
  const updateRow = (index: number, patch: Partial<ParameterGridRow>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }} data-testid="parameter-grid">
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="subtitle1">{title}</Typography>
          {!readOnly ? (
            <Button
              size="small"
              startIcon={<AddOutlinedIcon />}
              onClick={() => onChange([...value, emptyRow()])}
            >
              Add parameter
            </Button>
          ) : null}
        </Stack>

        {value.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No parameters recorded.
          </Typography>
        ) : (
          value.map((row, index) => (
            <Stack
              key={`param-${index}`}
              spacing={1}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'flex-start' }}
              >
                <TextField
                  size="small"
                  label="Name"
                  value={row.name}
                  disabled={readOnly}
                  onChange={(e) => updateRow(index, { name: e.target.value })}
                  fullWidth
                  required
                />
                {!readOnly ? (
                  <IconButton
                    aria-label="Remove parameter"
                    onClick={() =>
                      onChange(value.filter((_, i) => i !== index))
                    }
                  >
                    <DeleteOutlineOutlinedIcon />
                  </IconButton>
                ) : null}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  size="small"
                  label="Expected"
                  value={row.expectedValue}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateRow(index, { expectedValue: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Actual"
                  value={row.actualValue}
                  disabled={readOnly}
                  onChange={(e) =>
                    updateRow(index, { actualValue: e.target.value })
                  }
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Unit"
                  value={row.unit}
                  disabled={readOnly}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                  sx={{ minWidth: 100 }}
                />
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'center' } }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={row.passed === true}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateRow(index, {
                          passed: e.target.checked ? true : null,
                        })
                      }
                    />
                  }
                  label="Passed"
                />
                <TextField
                  size="small"
                  label="Notes"
                  value={row.notes}
                  disabled={readOnly}
                  onChange={(e) => updateRow(index, { notes: e.target.value })}
                  fullWidth
                />
              </Stack>
            </Stack>
          ))
        )}
      </Stack>
    </Paper>
  );
}
