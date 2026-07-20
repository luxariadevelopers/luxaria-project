import { Stack, Typography } from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { PermissionDenied } from '@/components/errors';
import { DocumentListPanel, DocumentUploadPanel } from '@/documents';

type Props = {
  unitId: string;
  projectId: string;
  unitLabel: string;
};

/**
 * Document context for a sales unit (`entityType=unit`).
 * List requires `document.view`; upload requires `document.upload`.
 */
export function UnitDocumentsPanel({
  unitId,
  projectId,
  unitLabel,
}: Props) {
  const { hasPermission } = useAuth();
  const canView = hasPermission('document.view');
  const canUpload = hasPermission('document.upload');

  if (!canView) {
    return (
      <PermissionDenied
        title="Documents unavailable"
        message="You need document.view to open unit documents."
      />
    );
  }

  return (
    <Stack spacing={2} data-testid="unit-documents-panel">
      <Typography variant="body2" color="text.secondary">
        Documents for unit {unitLabel}.
      </Typography>
      {canUpload ? (
        <DocumentUploadPanel
          title="Upload documents"
          context={{
            projectId,
            module: 'units',
            entityType: 'unit',
            entityId: unitId,
            documentType: 'attachment',
          }}
        />
      ) : null}
      <DocumentListPanel
        entityType="unit"
        entityId={unitId}
        projectId={projectId}
        module="units"
        title="Attached documents"
      />
    </Stack>
  );
}
