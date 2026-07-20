import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { ApprovalStatus, approvalStatusCatalog } from '@luxaria/shared-types';
import { formatDateTime, formatInr } from '@/format';
import { AgeingIndicator } from './AgeingIndicator';
import type { PublicApprovalRequest } from './types';

type Props = {
  approval: PublicApprovalRequest;
  dense?: boolean;
};

function statusLabel(status: string): string {
  return approvalStatusCatalog.label(status);
}

export function ApprovalSummaryCard({ approval, dense = false }: Props) {
  const detailTo = `/approvals/${approval.id}`;
  const isPending = approval.status === ApprovalStatus.Pending;

  return (
    <Box
      sx={{
        p: dense ? 1.5 : 2,
        border: '1px solid',
        borderColor: isPending ? 'warning.light' : 'divider',
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography
            variant={dense ? 'subtitle2' : 'subtitle1'}
            sx={{ fontWeight: 700 }}
          >
            {approval.approvalCode}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={statusLabel(String(approval.status))}
          />
          <AgeingIndicator
            stepEnteredAt={approval.stepEnteredAt}
            requestedAt={approval.requestedAt}
            escalated={approval.escalated}
          />
          {approval.escalated ? (
            <Chip size="small" color="error" label="Escalated" />
          ) : null}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {approval.module} · {approval.entityType}
          {approval.reason ? ` · ${approval.reason}` : ''}
        </Typography>

        <Stack
          direction="row"
          spacing={2}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          <Typography variant="body2">
            Amount: {formatInr(approval.amount)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {approval.currentStep}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Requested{' '}
            {approval.requestedAt
              ? formatDateTime(approval.requestedAt)
              : '—'}
          </Typography>
        </Stack>

        {/* Safe navigation only — no approve/reject in this phase */}
        <Button
          component={RouterLink}
          to={detailTo}
          size="small"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        >
          Open approval
        </Button>
      </Stack>
    </Box>
  );
}
