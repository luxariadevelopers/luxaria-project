import { useRef, useState } from 'react';
import {
  Button,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatOptionalCount } from '@/director-command-centre/formatMetric';
import { InvestorDocumentCategory } from './types';
import type { PublicInvestorDocument } from './types';

type Props = {
  documents: readonly PublicInvestorDocument[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
  canUpload: boolean;
  uploading?: boolean;
  onUpload: (file: File, category: string) => void | Promise<void>;
};

const CATEGORY_OPTIONS = Object.values(InvestorDocumentCategory);

export function InvestorDocumentPanel({
  documents,
  loading,
  error,
  onRetry,
  canView,
  canUpload,
  uploading = false,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(
    InvestorDocumentCategory.Kyc,
  );

  if (!canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="You need investor.view to list investor documents."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  return (
    <Stack spacing={2} data-testid="investor-document-panel">
      {canUpload ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="investor-doc-category">Category</InputLabel>
            <Select
              labelId="investor-doc-category"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) {
                void onUpload(file, category);
              }
            }}
          />
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Upload requires investor.upload_document.
        </Typography>
      )}

      {loading ? (
        <Typography color="text.secondary">Loading documents…</Typography>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents"
          description="PAN, Aadhaar, bank proof and KYC files uploaded for this investor will appear here."
        />
      ) : (
        <List dense disablePadding>
          {documents.map((doc) => (
            <ListItem
              key={doc.id}
              divider
              secondaryAction={
                <Typography variant="caption" color="text.secondary">
                  {doc.category}
                </Typography>
              }
            >
              <ListItemText
                primary={doc.fileName}
                secondary={`${formatOptionalCount(doc.sizeBytes)} bytes${
                  doc.createdAt ? ` · ${doc.createdAt.slice(0, 10)}` : ''
                }`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
