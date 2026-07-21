import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { DataTable } from '@/components/data-table';
import { PermissionDenied } from '@/components/errors';
import { formatDate } from '@/format';
import { PROJECT_DOCUMENT_CATEGORY_OPTIONS } from './constants';
import {
  ProjectDocumentCategory,
  type PublicProjectDocument,
} from './types';

type Props = {
  documents: readonly PublicProjectDocument[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
  canUpload: boolean;
  uploading?: boolean;
  page: number;
  pageSize: number;
  rowCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onUpload: (input: {
    file: File;
    category: string;
    description?: string;
  }) => void | Promise<void>;
};

const columns: GridColDef<PublicProjectDocument>[] = [
  {
    field: 'fileName',
    headerName: 'File',
    minWidth: 240,
    flex: 1,
  },
  {
    field: 'category',
    headerName: 'Category',
    width: 130,
  },
  {
    field: 'description',
    headerName: 'Description',
    minWidth: 220,
    flex: 1,
    valueFormatter: (value: string | null) => value ?? '—',
  },
  {
    field: 'mimeType',
    headerName: 'Type',
    width: 160,
    valueFormatter: (value: string | null) => value ?? '—',
  },
  {
    field: 'sizeBytes',
    headerName: 'Size',
    width: 120,
    valueFormatter: (value: number) =>
      value < 1024 * 1024
        ? `${Math.max(1, Math.round(value / 1024))} KB`
        : `${(value / (1024 * 1024)).toFixed(1)} MB`,
  },
  {
    field: 'createdAt',
    headerName: 'Uploaded',
    width: 130,
    valueFormatter: (value: string | undefined) => formatDate(value),
  },
];

export function ProjectDocumentsPanel({
  documents,
  loading = false,
  error,
  onRetry,
  canView,
  canUpload,
  uploading = false,
  page,
  pageSize,
  rowCount,
  onPageChange,
  onPageSizeChange,
  onUpload,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(
    ProjectDocumentCategory.General,
  );
  const [description, setDescription] = useState('');
  const [fileError, setFileError] = useState<string>();

  if (!canView) {
    return (
      <PermissionDenied
        title="Project documents unavailable"
        message="You need project.view and explicit project access."
        showHomeLink={false}
      />
    );
  }

  const selectFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setFileError('Files must be 15 MB or smaller.');
      return;
    }
    setFileError(undefined);
    void onUpload({
      file,
      category,
      description: description.trim() || undefined,
    });
  };

  return (
    <Stack spacing={2} data-testid="project-documents-panel">
      {canUpload ? (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}
        >
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="project-document-category">Category</InputLabel>
            <Select
              labelId="project-document-category"
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {PROJECT_DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                <MenuItem key={String(option.value)} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            sx={{ minWidth: 240, flex: 1 }}
          />
          <Button
            variant="contained"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            aria-label="Project document file"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) selectFile(file);
            }}
          />
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Upload requires project.upload_document.
        </Typography>
      )}

      {fileError ? <Alert severity="error">{fileError}</Alert> : null}

      <DataTable<PublicProjectDocument>
        title="Project documents"
        rows={documents}
        columns={columns}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyTitle="No project documents"
        emptyDescription="Uploaded approvals, RERA files, contracts, drawings, and photos will appear here."
        paginationMode="server"
        page={page}
        pageSize={pageSize}
        rowCount={rowCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        getRowId={(row) => row.id}
        height={460}
        preferencesKey="project-documents"
      />
    </Stack>
  );
}
