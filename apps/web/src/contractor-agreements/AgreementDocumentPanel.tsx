import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { DocumentUploadPanel } from '@/documents';
import type { PublicDocument } from '@luxaria/shared-types';
import type { PublicContractorAgreement } from './types';
import { isEditableAgreementStatus } from './versionHelpers';
import { useUpdateContractorAgreement } from './useContractorAgreements';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  agreement: PublicContractorAgreement | null;
  canUpload: boolean;
};

/**
 * Signed agreement PDF via documents module (document.upload),
 * stored on `agreementDocument` (contractor_agreement.manage).
 */
export function AgreementDocumentPanel({
  open,
  onClose,
  projectId,
  agreement,
  canUpload,
}: Props) {
  const update = useUpdateContractorAgreement();
  const { success, error: notifyError } = useNotify();
  const [manualRef, setManualRef] = useState('');

  if (!agreement) return null;

  const attach = async (reference: string) => {
    const trimmed = reference.trim();
    if (!trimmed) return;
    try {
      await update.mutateAsync({
        id: agreement.id,
        input: { agreementDocument: trimmed },
      });
      success('Agreement document attached');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  const onConfirmedChange = (documents: PublicDocument[]) => {
    const latest = documents[documents.length - 1];
    if (!latest) return;
    void attach(latest.id);
  };

  const editable =
    canUpload && isEditableAgreementStatus(agreement.status);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Agreement document — {agreement.agreementNumber} v{agreement.version}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} data-testid="agreement-document-panel">
          <Typography variant="body2" color="text.secondary">
            Upload the signed agreement PDF (document.upload), then save the
            document id on the draft (contractor_agreement.manage).
          </Typography>

          {agreement.agreementDocument ? (
            <Alert severity="success">
              Current document reference: {agreement.agreementDocument}
            </Alert>
          ) : (
            <Alert severity="info" variant="outlined">
              No agreement document attached yet.
            </Alert>
          )}

          {editable ? (
            <DocumentUploadPanel
              title="Upload signed agreement"
              multiple={false}
              context={{
                projectId,
                module: 'contractors',
                entityType: 'contractor_agreement',
                entityId: agreement.id,
                documentType: 'contractor_agreement',
              }}
              documentTypeOptions={['contractor_agreement', 'attachment']}
              onConfirmedChange={onConfirmedChange}
            />
          ) : (
            <Alert severity="warning" variant="outlined">
              Documents can only be attached while the agreement is draft or
              rejected.
            </Alert>
          )}

          {editable ? (
            <TextField
              label="Manual document reference"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              size="small"
              fullWidth
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {editable ? (
          <Button
            variant="contained"
            disabled={!manualRef.trim() || update.isPending}
            onClick={() => void attach(manualRef)}
          >
            Save reference
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
