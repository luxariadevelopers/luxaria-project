import { Stack, Typography } from '@mui/material';
import { DocumentListPanel, DocumentUploadPanel } from '@/documents';
import { useAuth } from '@/auth/AuthContext';

type Props = {
  requestId: string;
  projectId: string;
  requestNumber: string;
};

/**
 * Documents for a purchase request (`entityType=purchase_request`).
 * List requires `document.view`; upload requires `document.upload`.
 */
export function PurchaseRequestDocumentsPanel({
  requestId,
  projectId,
  requestNumber,
}: Props) {
  const { hasPermission } = useAuth();
  const canUpload = hasPermission('document.upload');

  return (
    <Stack spacing={2} data-testid="purchase-request-documents-panel">
      <Typography variant="body2" color="text.secondary">
        Supporting documents for {requestNumber}.
      </Typography>
      {canUpload ? (
        <DocumentUploadPanel
          title="Upload documents"
          context={{
            projectId,
            module: 'purchase-requests',
            entityType: 'purchase_request',
            entityId: requestId,
            documentType: 'attachment',
          }}
        />
      ) : null}
      <DocumentListPanel
        entityType="purchase_request"
        entityId={requestId}
        projectId={projectId}
        module="purchase-requests"
        title="Attached documents"
      />
    </Stack>
  );
}
