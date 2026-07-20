import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import type { PublicQualityInspection } from './types';
import { useCancelQualityInspection } from './useQualityInspections';

type Props = {
  open: boolean;
  onClose: () => void;
  inspection: PublicQualityInspection | null;
  onCancelled?: () => void;
};

export function CancelInspectionDialog({
  open,
  onClose,
  inspection,
  onCancelled,
}: Props) {
  const cancel = useCancelQualityInspection();
  const { success, error: notifyError } = useNotify();

  const onConfirm = async () => {
    if (!inspection) return;
    try {
      await cancel.mutateAsync(inspection.id);
      success('Quality inspection cancelled');
      onClose();
      onCancelled?.();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cancel {inspection?.inspectionNumber}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Requires quality.inspect. Completed inspections cannot be cancelled
          (Nest enforces).
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={cancel.isPending}>
          Keep open
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => void onConfirm()}
          disabled={cancel.isPending || !inspection}
        >
          {cancel.isPending ? 'Cancelling…' : 'Cancel inspection'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
