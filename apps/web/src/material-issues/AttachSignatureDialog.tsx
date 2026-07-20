import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import type { PublicDocument } from '@luxaria/shared-types';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DocumentUploadPanel } from '@/documents';
import { SignaturePreview } from './SignaturePreview';
import type { PublicMaterialIssue } from './types';
import { useAttachSignatures } from './useMaterialIssues';

type Props = {
  open: boolean;
  onClose: () => void;
  issue: PublicMaterialIssue | null;
  canUpload: boolean;
  canDownload: boolean;
  onAttached?: () => void;
};

/**
 * Capture recipient signature (`POST …/signatures`, `stock.issue`).
 * Uses document checksum from confirmed upload.
 */
export function AttachSignatureDialog({
  open,
  onClose,
  issue,
  canUpload,
  canDownload,
  onAttached,
}: Props) {
  const attach = useAttachSignatures();
  const { success, error: notifyError } = useNotify();
  const [doc, setDoc] = useState<PublicDocument | null>(null);

  const save = () => {
    const documentId = doc?.id;
    const checksum = doc?.checksum;
    if (!issue || !documentId || !checksum) {
      notifyError('Upload an active signature document with checksum first');
      return;
    }
    void (async () => {
      try {
        await attach.mutateAsync({
          id: issue.id,
          input: {
            recipientSignatureDocumentId: documentId,
            recipientSignatureChecksum: checksum,
          },
        });
        success('Recipient signature attached');
        setDoc(null);
        onClose();
        onAttached?.();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="attach-signature-dialog"
    >
      <DialogTitle>Attach recipient signature</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Recipient signature (document id + SHA-256) is required before
            submit/confirm.
          </Typography>
          {canUpload && issue ? (
            <DocumentUploadPanel
              context={{
                module: 'material-issues',
                entityType: 'material_issue',
                entityId: issue.id,
                documentType: 'signature',
                projectId: issue.projectId,
              }}
              title="Upload signature"
              multiple={false}
              onConfirmedChange={(docs) => setDoc(docs[0] ?? null)}
            />
          ) : (
            <Typography variant="body2" color="warning.main">
              Need document.upload to attach a signature
            </Typography>
          )}
          {doc ? (
            <SignaturePreview
              documentId={doc.id}
              checksum={doc.checksum}
              canDownload={canDownload}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setDoc(null);
            onClose();
          }}
          disabled={attach.isPending}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={attach.isPending || !doc?.checksum}
        >
          {attach.isPending ? 'Saving…' : 'Save signature'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
