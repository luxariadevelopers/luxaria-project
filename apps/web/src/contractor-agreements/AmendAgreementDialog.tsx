import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatInr } from '@/format';
import { assertCanStartAmendment } from './versionHelpers';
import type { PublicContractorAgreement } from './types';
import { useAmendContractorAgreement } from './useContractorAgreements';

type Props = {
  open: boolean;
  onClose: () => void;
  agreement: PublicContractorAgreement | null;
  versions: readonly PublicContractorAgreement[];
  onAmended?: (draft: PublicContractorAgreement) => void;
};

export function AmendAgreementDialog({
  open,
  onClose,
  agreement,
  versions,
  onAmended,
}: Props) {
  const amend = useAmendContractorAgreement();
  const { success, error: notifyError } = useNotify();

  if (!agreement) return null;

  const check = assertCanStartAmendment({ source: agreement, versions });

  const onConfirm = async () => {
    if (!check.ok) return;
    try {
      const draft = await amend.mutateAsync({ id: agreement.id, input: {} });
      success(`Amendment draft v${draft.version} created`);
      onAmended?.(draft);
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Amend agreement</DialogTitle>
      <DialogContent>
        <StackCopy agreement={agreement} check={check} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void onConfirm()}
          disabled={!check.ok || amend.isPending}
        >
          Create amendment draft
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function StackCopy({
  agreement,
  check,
}: {
  agreement: PublicContractorAgreement;
  check: ReturnType<typeof assertCanStartAmendment>;
}) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {agreement.agreementNumber} v{agreement.version} —{' '}
        {formatInr(agreement.agreedRates)}
      </Typography>
      {!check.ok ? (
        <Alert severity="warning">{check.message}</Alert>
      ) : (
        <Alert severity="info" variant="outlined">
          A new draft version will be created with the same agreement number.
          Edit commercial fields before submitting for approval.
        </Alert>
      )}
    </>
  );
}
