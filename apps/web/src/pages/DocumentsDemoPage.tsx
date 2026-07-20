import { useState } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import type { PublicDocument } from '@luxaria/shared-types';
import { DocumentListPanel, DocumentUploadPanel } from '@/documents';

/**
 * Dev-only documents demo (Micro Phase 009). Not in the sidebar.
 * Provide a real Mongo entity id from your environment to exercise live APIs.
 */
export function DocumentsDemoPage() {
  const [entityId, setEntityId] = useState('');
  const [confirmed, setConfirmed] = useState<PublicDocument[]>([]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Documents demo</Typography>
      <Typography color="text.secondary">
        Presign → private S3 PUT → confirm. Only confirmed documents are listed
        as attachments. Open <code>/dev/documents</code> (no menu item).
      </Typography>

      <Alert severity="info" variant="outlined">
        Enter an existing entity ObjectId (e.g. a project or investor id) you
        can access. Requires permissions{' '}
        <code>document.upload</code> / <code>document.view</code>.
      </Alert>

      <TextField
        label="Entity id (Mongo ObjectId)"
        value={entityId}
        onChange={(e) => setEntityId(e.target.value.trim())}
        helperText="module=projects · entityType=project · documentType editable in panel"
        sx={{ maxWidth: 420 }}
      />

      {entityId.length === 24 ? (
        <>
          <DocumentUploadPanel
            context={{
              module: 'projects',
              entityType: 'project',
              entityId,
              documentType: 'attachment',
            }}
            onConfirmedChange={setConfirmed}
          />
          <Typography variant="body2" color="text.secondary">
            Confirmed ids for record attach:{' '}
            {confirmed.length
              ? confirmed.map((d) => d.id).join(', ')
              : 'none yet'}
          </Typography>
          <DocumentListPanel
            entityType="project"
            entityId={entityId}
            module="projects"
          />
        </>
      ) : (
        <Typography color="text.secondary">
          Provide a 24-character ObjectId to enable the upload panel.
        </Typography>
      )}
    </Stack>
  );
}
