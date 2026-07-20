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
import { canLockPeriod } from './canLockPeriod';
import { periodDisplayLabel } from './labels';
import type { PublicAccountingPeriod } from './types';
import { useLockAccountingPeriod } from './usePeriodClose';

type Props = {
  open: boolean;
  onClose: () => void;
  period: PublicAccountingPeriod | null;
};

/**
 * Confirms Nest `POST …/lock` (`period_closure.manage`).
 * Submit is disabled when client gate finds unresolved blocking checks.
 */
export function LockPeriodDialog({ open, onClose, period }: Props) {
  const lockMut = useLockAccountingPeriod();
  const { success, error: notifyError } = useNotify();
  const gate = canLockPeriod(period);

  const onConfirm = async () => {
    if (!period || !gate.ok) return;
    try {
      await lockMut.mutateAsync(period.id);
      success('Accounting period locked');
      onClose();
    } catch (err) {
      notifyError(getErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      data-testid="lock-period-dialog"
    >
      <DialogTitle>
        Lock {period ? periodDisplayLabel(period) : 'period'}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Locking prevents further postings in this period. Nest rejects the
          lock when pre-close validation has not passed or checklist items
          remain failed.
        </Typography>
        {gate.ok ? (
          <Alert severity="info" variant="outlined">
            Pre-close validation passed. Confirm to lock this period.
          </Alert>
        ) : (
          <Alert
            severity="error"
            variant="outlined"
            data-testid="lock-period-blocked"
          >
            {gate.reason}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={lockMut.isPending}>
          Back
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={() => void onConfirm()}
          disabled={lockMut.isPending || !gate.ok}
          data-testid="lock-period-confirm"
        >
          {lockMut.isPending ? 'Locking…' : 'Lock period'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
