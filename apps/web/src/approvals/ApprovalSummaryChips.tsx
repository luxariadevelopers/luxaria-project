import { Chip, Stack, Typography } from '@mui/material';
import { ApprovalStatus } from '@luxaria/shared-types';
import type { PublicApprovalRequest } from './types';
import { computeApprovalAgeing } from './ageing';

type Props = {
  /** Pending total for the active project (`meta.total` with status=pending). */
  pendingTotal: number;
  /** Rows currently shown in the table (after client filters). */
  visibleRows: readonly PublicApprovalRequest[];
  /** Server/list total when not in client-filter mode. */
  listTotal: number | null;
  statusFilter: string;
  onSelectStatus: (status: string) => void;
  onSelectAgeing: (ageing: string) => void;
  ageingFilter: string;
};

/**
 * Quick-filter chips for the approval work queue (status + ageing summaries).
 */
export function ApprovalSummaryChips({
  pendingTotal,
  visibleRows,
  listTotal,
  statusFilter,
  onSelectStatus,
  onSelectAgeing,
  ageingFilter,
}: Props) {
  const escalatedOnPage = visibleRows.filter((r) => r.escalated).length;
  const staleOnPage = visibleRows.filter((r) => {
    const a = computeApprovalAgeing({
      stepEnteredAt: r.stepEnteredAt,
      requestedAt: r.requestedAt,
      escalated: r.escalated,
    });
    return a.level === 'stale';
  }).length;

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Summary
        {listTotal != null ? ` · ${listTotal} matching list total` : null}
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Chip
          size="small"
          color={statusFilter === ApprovalStatus.Pending ? 'warning' : 'default'}
          variant={
            statusFilter === ApprovalStatus.Pending ? 'filled' : 'outlined'
          }
          label={`${pendingTotal} pending`}
          onClick={() => onSelectStatus(ApprovalStatus.Pending)}
        />
        <Chip
          size="small"
          variant={statusFilter === '' ? 'filled' : 'outlined'}
          label="All statuses"
          onClick={() => onSelectStatus('')}
        />
        <Chip
          size="small"
          color={statusFilter === ApprovalStatus.Returned ? 'info' : 'default'}
          variant={
            statusFilter === ApprovalStatus.Returned ? 'filled' : 'outlined'
          }
          label="Returned"
          onClick={() => onSelectStatus(ApprovalStatus.Returned)}
        />
        <Chip
          size="small"
          color={ageingFilter === 'escalated' ? 'error' : 'default'}
          variant={ageingFilter === 'escalated' ? 'filled' : 'outlined'}
          label={`${escalatedOnPage} escalated (page)`}
          onClick={() =>
            onSelectAgeing(ageingFilter === 'escalated' ? '' : 'escalated')
          }
        />
        <Chip
          size="small"
          color={ageingFilter === 'stale' ? 'error' : 'default'}
          variant={ageingFilter === 'stale' ? 'filled' : 'outlined'}
          label={`${staleOnPage} stale (page)`}
          onClick={() =>
            onSelectAgeing(ageingFilter === 'stale' ? '' : 'stale')
          }
        />
      </Stack>
    </Stack>
  );
}
