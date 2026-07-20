import { Paper, Stack, Typography } from '@mui/material';
import { DocumentListPanel, DocumentUploadPanel } from '@/documents';

type Props = {
  inspectionId: string;
  projectId: string;
  samplePhotos: string[];
  testDocuments: string[];
  canUpload: boolean;
  onSamplePhotosChange?: (ids: string[]) => void;
  onTestDocumentsChange?: (ids: string[]) => void;
};

/**
 * Sample photos + test documents as Nest document id arrays
 * (`samplePhotos`, `testDocuments`).
 */
export function SampleMediaPanel({
  inspectionId,
  projectId,
  samplePhotos,
  testDocuments,
  canUpload,
  onSamplePhotosChange,
  onTestDocumentsChange,
}: Props) {
  return (
    <Stack spacing={2} data-testid="sample-media-panel">
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Sample photos
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Attached ids: {samplePhotos.length ? samplePhotos.join(', ') : '—'}
        </Typography>
        {canUpload ? (
          <DocumentUploadPanel
            context={{
              module: 'quality-inspections',
              entityType: 'quality_inspection',
              entityId: inspectionId,
              documentType: 'sample_photo',
              projectId,
            }}
            title="Upload sample photos"
            onConfirmedChange={(docs) =>
              onSamplePhotosChange?.(docs.map((d) => d.id))
            }
          />
        ) : (
          <DocumentListPanel
            entityType="quality_inspection"
            entityId={inspectionId}
            module="quality-inspections"
            projectId={projectId}
            title="Sample photos"
          />
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Test documents
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Attached ids:{' '}
          {testDocuments.length ? testDocuments.join(', ') : '—'}
        </Typography>
        {canUpload ? (
          <DocumentUploadPanel
            context={{
              module: 'quality-inspections',
              entityType: 'quality_inspection',
              entityId: inspectionId,
              documentType: 'test_document',
              projectId,
            }}
            title="Upload test documents"
            onConfirmedChange={(docs) =>
              onTestDocumentsChange?.(docs.map((d) => d.id))
            }
          />
        ) : (
          <DocumentListPanel
            entityType="quality_inspection"
            entityId={inspectionId}
            module="quality-inspections"
            projectId={projectId}
            title="Test documents"
          />
        )}
      </Paper>
    </Stack>
  );
}
