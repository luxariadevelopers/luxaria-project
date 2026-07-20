import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { FileUpload } from '@/components/FileUpload';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  isAllowedDocumentMimeType,
} from '@/validation';


type DocumentPickerProps<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  multiple?: boolean;
  disabled?: boolean;
  helperText?: string;
};

const ACCEPT = ALLOWED_DOCUMENT_MIME_TYPES.join(',');
const MAX_MB = MAX_ATTACHMENT_BYTES / (1024 * 1024);

/**
 * Document file picker aligned with shared attachment MIME / size rules
 * (`documents.constants` / PresignUploadDto max 100MB).
 */
export function DocumentPicker<T extends FieldValues>({
  name,
  control,
  label = 'Attach documents',
  multiple = true,
  disabled,
  helperText,
}: DocumentPickerProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FileUpload
          label={label}
          accept={ACCEPT}
          multiple={multiple}
          maxSizeMb={MAX_MB}
          disabled={disabled}
          value={(field.value as File[] | undefined) ?? []}
          helperText={
            fieldState.error?.message ??
            helperText ??
            `Allowed: PDF, images, Office docs (max ${MAX_MB} MB)`
          }
          onChange={(files) => {
            const allowed = files.filter(
              (f) => !f.type || isAllowedDocumentMimeType(f.type),
            );
            field.onChange(allowed);
            field.onBlur();
          }}

        />
      )}
    />
  );
}
