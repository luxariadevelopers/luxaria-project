import { useRef, useState } from 'react';
import {
  Button,
  Chip,
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
import { CustomerDocumentCategory } from './types';
import type { PublicCustomerDocument } from './types';

type Props = {
  documents: readonly PublicCustomerDocument[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
  canUpload: boolean;
  canViewSensitive: boolean;
  uploading?: boolean;
  onUpload: (file: File, category: string) => void | Promise<void>;
};

const CATEGORY_OPTIONS = Object.values(CustomerDocumentCategory);

export function CustomerDocumentPanel({
  documents,
  loading,
  error,
  onRetry,
  canView,
  canUpload,
  canViewSensitive,
  uploading = false,
  onUpload,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(
    CustomerDocumentCategory.Kyc,
  );

  if (!canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="You need customer.view to list customer documents."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  return (
    <Stack spacing={2} data-testid="customer-document-panel">
      {canUpload ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="customer-doc-category">Category</InputLabel>
            <Select
              labelId="customer-doc-category"
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
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void onUpload(file, category);
              }
              e.target.value = '';
            }}
          />
          <Button
            variant="outlined"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload document'}
          </Button>
        </Stack>
      ) : null}

      {!canViewSensitive ? (
        <Typography variant="caption" color="text.secondary">
          Sensitive KYC downloads require customer.manage. Metadata is still
          listed.
        </Typography>
      ) : null}

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading documents…
        </Typography>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents"
          description="Upload PAN, Aadhaar, or KYC proofs for this customer."
        />
      ) : (
        <List dense disablePadding>
          {documents.map((doc) => (
            <ListItem
              key={doc.id}
              divider
              secondaryAction={
                doc.isSensitive ? (
                  <Chip size="small" label="Sensitive" variant="outlined" />
                ) : null
              }
            >
              <ListItemText
                primary={doc.fileName}
                secondary={`${doc.category} · ${formatOptionalCount(doc.sizeBytes)} bytes`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Stack>
  );
}
