import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Typography,
} from '@mui/material';
import type { ExportFieldOption } from './types';

type Props = {
  fields: readonly ExportFieldOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
};

export function ExportFieldSelection({
  fields,
  selectedIds,
  onChange,
  error,
  disabled,
}: Props) {
  const selected = new Set(selectedIds);

  return (
    <>
      <Typography variant="subtitle2">Fields</Typography>
      <FormGroup>
        {fields.map((field) => (
          <FormControlLabel
            key={field.id}
            control={
              <Checkbox
                size="small"
                checked={selected.has(field.id)}
                disabled={disabled}
                onChange={(_, checked) => {
                  const next = new Set(selected);
                  if (checked) next.add(field.id);
                  else next.delete(field.id);
                  onChange([...next]);
                }}
              />
            }
            label={field.label}
          />
        ))}
      </FormGroup>
      {error ? <FormHelperText error>{error}</FormHelperText> : null}
    </>
  );
}
