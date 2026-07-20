import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import {
  canApproveReport,
  canCancelReport,
  canSubmitReport,
  type MaterialVarianceCapabilities,
} from './roleAccess';
import { MaterialConsumptionReportStatus } from './types';
import { validateApproveComment } from './validation';

type ApprovalActionsProps = {
  reportId: string;
  status: MaterialConsumptionReportStatus;
  requiresApproval: boolean;
  caps: MaterialVarianceCapabilities;
  onSubmit: () => void;
  onApprove: (approvalComment: string) => void;
  onCancel: () => void;
  busy?: boolean;
  submitDisabled?: boolean;
  submitDisabledReason?: string;
};

export function ApprovalActions({
  reportId,
  status,
  requiresApproval,
  caps,
  onSubmit,
  onApprove,
  onCancel,
  busy,
  submitDisabled,
  submitDisabledReason,
}: ApprovalActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);

  const showSubmit = canSubmitReport(caps, status);
  const showApprove = canApproveReport(caps, status);
  const showCancel = canCancelReport(caps, status);

  const handleApprove = () => {
    const result = validateApproveComment({
      requiresApproval,
      approvalComment,
    });
    if (!result.ok) {
      setApproveError(result.issues[0]?.message ?? 'Approval comment required');
      return;
    }
    setApproveError(null);
    onApprove(approvalComment.trim());
    setApproveOpen(false);
    setApprovalComment('');
  };

  if (!showSubmit && !showApprove && !showCancel) {
    return null;
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ flexWrap: 'wrap' }}
      data-testid="approval-actions"
    >
      {showSubmit ? (
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || submitDisabled}
          title={submitDisabledReason}
        >
          Submit for approval
        </Button>
      ) : null}
      {showApprove ? (
        <Button
          variant="contained"
          color="success"
          onClick={() => setApproveOpen(true)}
          disabled={busy}
        >
          Approve report
        </Button>
      ) : null}
      {showCancel ? (
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={busy}>
          Cancel report
        </Button>
      ) : null}

      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Approve material consumption report</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Approval comment"
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              required={requiresApproval}
              error={Boolean(approveError)}
              helperText={
                approveError ??
                (requiresApproval
                  ? 'Required when the report has variance lines needing approval.'
                  : 'Optional comment for the approval record.')
              }
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveOpen(false)}>Close</Button>
          <Button variant="contained" color="success" onClick={handleApprove} disabled={busy}>
            Confirm approval
          </Button>
        </DialogActions>
      </Dialog>
      <span hidden data-report-id={reportId} />
    </Stack>
  );
}
