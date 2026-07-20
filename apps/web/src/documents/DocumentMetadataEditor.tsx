import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { DOCUMENT_TYPE_REGEX } from '@luxaria/shared-types';

export type DocumentMetadataValue = {
  documentType: string;
};

type Props = {
  value: DocumentMetadataValue;
  onChange: (value: DocumentMetadataValue) => void;
  /** Suggested document types for the entity (lowercase_underscore). */
  documentTypeOptions?: string[];
  disabled?: boolean;
  allowCustomType?: boolean;
};

/**
 * Metadata editor for required `documentType` (PresignUploadDto).
 */
export function DocumentMetadataEditor({
  value,
  onChange,
  documentTypeOptions = ['attachment', 'kyc', 'invoice', 'receipt', 'photo'],
  disabled,
  allowCustomType = true,
}: Props) {
  const custom =
    allowCustomType &&
    value.documentType &&
    !documentTypeOptions.includes(value.documentType);

  return (
    <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }}>
      <FormControl size="small" sx={{ minWidth: 180 }} disabled={disabled}>
        <InputLabel id="document-type-label">Document type</InputLabel>
        <Select
          labelId="document-type-label"
          label="Document type"
          value={
            documentTypeOptions.includes(value.documentType)
              ? value.documentType
              : custom
                ? '__custom__'
                : value.documentType || documentTypeOptions[0]
          }
          onChange={(e) => {
            const v = String(e.target.value);
            if (v === '__custom__') {
              onChange({ documentType: '' });
              return;
            }
            onChange({ documentType: v });
          }}
        >
          {documentTypeOptions.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
          {allowCustomType ? (
            <MenuItem value="__custom__">Custom…</MenuItem>
          ) : null}
        </Select>
      </FormControl>
      {custom ||
      (allowCustomType &&
        !documentTypeOptions.includes(value.documentType)) ? (
        <TextField
          size="small"
          label="Custom document type"
          helperText="lowercase letters, numbers, underscores"
          disabled={disabled}
          value={value.documentType}
          error={
            value.documentType.length > 0 &&
            !DOCUMENT_TYPE_REGEX.test(value.documentType)
          }
          onChange={(e) =>
            onChange({
              documentType: e.target.value.trim().toLowerCase(),
            })
          }
          sx={{ minWidth: 220 }}
        />
      ) : null}
    </Stack>
  );
}
