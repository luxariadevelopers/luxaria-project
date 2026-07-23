import { useState } from 'react';
import {
  Button,
  Drawer,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/api/errors';
import { useNotify } from '@/components/NotificationProvider';
import { formatDateTime, formatQuantity } from '@/format';
import {
  materialUnitLabel,
  stockReservationSourceLabel,
} from './labels';
import type { StockReservationCapabilities } from './roleAccess';
import { StockReservationStatusChip } from './StockReservationStatusChip';
import {
  StockReservationStatus,
  type PublicStockReservation,
} from './types';
import {
  useCancelStockReservation,
  useReleaseStockReservation,
} from './useStockReservations';

type Props = {
  open: boolean;
  onClose: () => void;
  reservation: PublicStockReservation | null;
  caps: StockReservationCapabilities;
  onChanged: () => void;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Stack>
  );
}

export function ReservationDetailDrawer({
  open,
  onClose,
  reservation,
  caps,
  onChanged,
}: Props) {
  const { success, error: notifyError } = useNotify();
  const release = useReleaseStockReservation();
  const cancel = useCancelStockReservation();
  const [releaseQty, setReleaseQty] = useState('');

  if (!reservation) return null;

  const active = reservation.status === StockReservationStatus.Active;
  const busy = release.isPending || cancel.isPending;

  const handleRelease = (partial: boolean) => {
    void (async () => {
      try {
        const qty = Number(releaseQty);
        await release.mutateAsync({
          id: reservation.id,
          input:
            partial && Number.isFinite(qty) && qty > 0
              ? { quantity: qty }
              : {},
        });
        success(partial ? 'Partial release recorded' : 'Reservation released');
        setReleaseQty('');
        onChanged();
        onClose();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  const handleCancel = () => {
    void (async () => {
      try {
        await cancel.mutateAsync(reservation.id);
        success('Reservation cancelled');
        onChanged();
        onClose();
      } catch (err) {
        notifyError(getErrorMessage(err));
      }
    })();
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Stack
        spacing={2}
        sx={{ width: { xs: 320, sm: 440 }, p: 2.5 }}
        data-testid="stock-reservation-detail-drawer"
      >
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6">{reservation.reservationNumber}</Typography>
          <StockReservationStatusChip status={reservation.status} />
        </Stack>

        <Field label="Material id" value={reservation.materialId} />
        <Field label="Location" value={reservation.location || '—'} />
        <Field
          label="Reserved qty"
          value={`${formatQuantity(reservation.quantity)} ${materialUnitLabel(reservation.unit)}`}
        />
        <Field
          label="Remaining (base)"
          value={formatQuantity(reservation.remainingBaseQuantity)}
        />
        <Field
          label="Source"
          value={`${stockReservationSourceLabel(reservation.sourceType)}${
            reservation.sourceId ? ` · ${reservation.sourceId}` : ''
          }`}
        />
        <Field
          label="Expires"
          value={
            reservation.expiresAt
              ? formatDateTime(reservation.expiresAt)
              : '—'
          }
        />
        <Field label="Notes" value={reservation.notes || '—'} />
        <Field
          label="Created"
          value={
            reservation.createdAt
              ? formatDateTime(reservation.createdAt)
              : '—'
          }
        />

        {active && caps.canReserve ? (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="subtitle2">Release hold</Typography>
            <TextField
              size="small"
              label="Partial quantity (optional)"
              type="number"
              value={releaseQty}
              onChange={(e) => setReleaseQty(e.target.value)}
              helperText="Leave empty to release the full remaining quantity"
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => handleRelease(Boolean(releaseQty.trim()))}
              >
                Release
              </Button>
              <Button
                color="error"
                variant="outlined"
                disabled={busy}
                onClick={handleCancel}
              >
                Cancel reservation
              </Button>
            </Stack>
          </Stack>
        ) : null}

        <Button onClick={onClose} sx={{ alignSelf: 'flex-end' }}>
          Close
        </Button>
      </Stack>
    </Drawer>
  );
}
