import {
  Box,
  Button,
  Divider,
  Drawer,
  Stack,
  Typography,
} from '@mui/material';
import { formDrawerPaperSx } from '@/components/forms';
import { WorkflowTimeline } from '@/workflow-timeline';
import { formatDate, formatInr } from '@/format';
import { buildCancellationTimeline } from './buildCancellationTimeline';
import { CancellationStatusChip } from './CancellationStatusChip';
import { RefundBreakdown } from './RefundBreakdown';
import type { BookingCancellationCapabilities } from './roleAccess';
import type { PublicBookingCancellation } from './types';
import { resolveCancellationActions } from './workflowActions';

type Props = {
  open: boolean;
  onClose: () => void;
  row: PublicBookingCancellation | null;
  caps: BookingCancellationCapabilities;
  onReview?: () => void;
  onSubmitApproval?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onProcessRefund?: () => void;
  onReleaseUnit?: () => void;
};

export function CancellationDetailDrawer({
  open,
  onClose,
  row,
  caps,
  onReview,
  onSubmitApproval,
  onApprove,
  onReject,
  onProcessRefund,
  onReleaseUnit,
}: Props) {
  if (!row) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: formDrawerPaperSx(480) } }}
      >
        <Box sx={{ p: 3 }} />
      </Drawer>
    );
  }

  const actions = resolveCancellationActions(row, caps);
  const events = buildCancellationTimeline(row);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: formDrawerPaperSx(520) },
      }}
    >
      <Box sx={{ p: 3 }} data-testid="cancellation-detail">
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography variant="h6">{row.cancellationNumber}</Typography>
            <CancellationStatusChip status={row.status} />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {formatDate(row.cancellationDate)} · Booking …{row.bookingId.slice(-8)}
          </Typography>
          <Typography variant="body2">{row.cancellationReason}</Typography>

          <RefundBreakdown
            totalReceived={row.totalReceived}
            cancellationCharge={row.cancellationCharge}
            deductions={row.deductions}
            approvedRefundOverride={row.approvedRefund}
          />

          {row.refundTransactionId ? (
            <Typography variant="body2">
              Refund txn: {row.refundTransactionId} (
              {formatInr(row.approvedRefund)})
            </Typography>
          ) : null}

          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {actions.includes('review') && onReview ? (
              <Button size="small" variant="outlined" onClick={onReview}>
                Review
              </Button>
            ) : null}
            {actions.includes('submit_approval') && onSubmitApproval ? (
              <Button
                size="small"
                variant="outlined"
                onClick={onSubmitApproval}
              >
                Submit approval
              </Button>
            ) : null}
            {actions.includes('approve') && onApprove ? (
              <Button size="small" variant="contained" onClick={onApprove}>
                Approve
              </Button>
            ) : null}
            {actions.includes('reject') && onReject ? (
              <Button size="small" color="error" onClick={onReject}>
                Reject
              </Button>
            ) : null}
            {actions.includes('process_refund') && onProcessRefund ? (
              <Button
                size="small"
                variant="contained"
                onClick={onProcessRefund}
              >
                Process refund
              </Button>
            ) : null}
            {actions.includes('release_unit') && onReleaseUnit ? (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={onReleaseUnit}
              >
                Release unit
              </Button>
            ) : null}
          </Stack>

          <Divider />

          <WorkflowTimeline
            title="Cancellation timeline"
            events={events}
            canView={caps.canView}
            emptyTitle="No timeline events"
            emptyDescription="Workflow events appear as the cancellation progresses."
          />
        </Stack>
      </Box>
    </Drawer>
  );
}
