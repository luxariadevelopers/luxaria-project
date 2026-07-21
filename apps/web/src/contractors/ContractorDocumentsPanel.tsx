import {
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { EmptyState, PermissionDenied, RetryPanel } from '@/components/errors';
import { formatDateTime } from '@/format';
import { contractorDocumentCategoryLabel } from './labels';
import type { PublicContractorDocument } from './types';

type Props = {
  documents: readonly PublicContractorDocument[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  canView: boolean;
};

export function ContractorDocumentsPanel({
  documents,
  loading,
  error,
  onRetry,
  canView,
}: Props) {
  if (!canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="You need contractor.view to list contractor documents."
        showHomeLink={false}
      />
    );
  }

  if (error) {
    return <RetryPanel error={error} onRetry={onRetry} forceRetry />;
  }

  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Loading documents…
      </Typography>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents"
        description="Licence, insurance, and KYC documents uploaded for this contractor will appear here."
      />
    );
  }

  return (
    <Stack spacing={1} data-testid="contractor-documents-panel">
      <List dense disablePadding>
        {documents.map((doc) => (
          <ListItem key={doc.id} divider disableGutters>
            <ListItemText
              primary={doc.fileName}
              secondary={`${contractorDocumentCategoryLabel(doc.category)}${
                doc.createdAt ? ` · ${formatDateTime(doc.createdAt)}` : ''
              }`}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
