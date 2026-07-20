import { Stack } from '@mui/material';
import { DetailHeader } from '@/components/entity-detail';
import { AgeingIndicator } from './AgeingIndicator';
import type { PublicApprovalRequest } from './types';

type Props = {
  approval: PublicApprovalRequest;
};

/**
 * Detail header for an approval request — deep-link back to the inbox.
 */
export function ApprovalHeader({ approval }: Props) {
  return (
    <DetailHeader
      title={approval.approvalCode}
      code={`${approval.module} · ${approval.entityType}`}
      subtitle={
        approval.reason?.trim()
          ? `Reason: ${approval.reason.trim()}`
          : undefined
      }
      backTo="/approvals"
      backLabel="Back to inbox"
      meta={
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <AgeingIndicator
            stepEnteredAt={approval.stepEnteredAt}
            requestedAt={approval.requestedAt}
            escalated={approval.escalated}
          />
        </Stack>
      }
    />
  );
}
