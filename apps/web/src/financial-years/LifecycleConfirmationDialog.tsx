import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { ErrorAlert } from '@/components/errors';
import {
  FinancialYearStatus,
  type PublicFinancialYear,
} from './types';

export type FinancialYearLifecycleAction = 'set-current' | 'lock';

type Props = {
  open: boolean;
  action: FinancialYearLifecycleAction;
  financialYear: PublicFinancialYear | null;
  loading?: boolean;
  error?: unknown;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
};

export function LifecycleConfirmationDialog({
  open,
  action,
  financialYear,
  loading = false,
  error,
  onConfirm,
  onClose,
}: Props) {
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => {
    if (open) setConfirmation('');
  }, [open, action, financialYear?.id]);

  if (!financialYear) return null;

  const isLock = action === 'lock';
  const matches = confirmation === financialYear.name;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      data-testid={`${action}-financial-year-dialog`}
    >
      <DialogTitle>
        {isLock ? 'Lock financial year' : 'Change current financial year'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity={isLock ? 'error' : 'warning'} variant="outlined">
            {isLock
              ? 'Locking rejects accounting postings dated inside this financial year. Unlocking later requires a reason and separate approval.'
              : `This removes the current marker from the company’s existing current year. A locked year cannot be made current.${
                  financialYear.status === FinancialYearStatus.Closed
                    ? ' The backend will also return this closed year to open.'
                    : ''
                }`}
          </Alert>
          <DialogContentText>
            Type <strong>{financialYear.name}</strong> exactly to confirm.
          </DialogContentText>
          <TextField
            autoFocus
            label="Confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={loading}
            fullWidth
            slotProps={{
              htmlInput: { 'aria-label': 'Confirmation' },
            }}
          />
          {error ? <ErrorAlert error={error} showDetails /> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isLock ? 'error' : 'primary'}
          disabled={!matches || loading}
          onClick={() => void onConfirm()}
          data-testid={`${action}-financial-year-confirm`}
        >
          {loading
            ? isLock
              ? 'Locking…'
              : 'Changing…'
            : isLock
              ? 'Lock financial year'
              : 'Set as current'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
