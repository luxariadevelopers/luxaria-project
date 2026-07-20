import { useRef, useState } from 'react';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';

export type FileUploadProps = {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMb?: number;
  disabled?: boolean;
  value?: File[];
  onChange: (files: File[]) => void;
  helperText?: string;
};

export function FileUpload({
  label = 'Upload files',
  accept,
  multiple = false,
  maxSizeMb = 25,
  disabled,
  value,
  onChange,
  helperText,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const files = value ?? [];

  const handleSelect = (list: FileList | null) => {
    if (!list) return;
    const next = multiple ? [...files] : [];
    const maxBytes = maxSizeMb * 1024 * 1024;
    for (const file of Array.from(list)) {
      if (file.size > maxBytes) {
        setError(`${file.name} exceeds ${maxSizeMb} MB`);
        return;
      }
      next.push(file);
    }
    setError(null);
    onChange(next);
  };

  const removeAt = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => handleSelect(e.target.files)}
      />
      <Button
        variant="outlined"
        startIcon={<CloudUploadOutlinedIcon />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
      {helperText ? (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 0.5, display: 'block' }}
        >
          {helperText}
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {error}
        </Typography>
      ) : null}
      {files.length > 0 ? (
        <List dense sx={{ mt: 1 }}>
          {files.map((file, index) => (
            <ListItem
              key={`${file.name}-${index}`}
              secondaryAction={
                <IconButton edge="end" onClick={() => removeAt(index)} disabled={disabled}>
                  <DeleteOutlineIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={file.name}
                secondary={`${(file.size / 1024).toFixed(1)} KB`}
              />
            </ListItem>
          ))}
        </List>
      ) : null}
    </Box>
  );
}
