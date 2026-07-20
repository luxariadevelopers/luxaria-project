import { Chip, Tooltip } from '@mui/material';
import { attachmentTypeLabel } from './labels';
import type { PublicSiteExpenseAttachment } from './types';
import { evidenceCount } from './warnings';

type Props = {
  attachments: readonly PublicSiteExpenseAttachment[];
};

/**
 * Attachment / evidence count for quick review of incomplete vouchers.
 */
export function EvidenceCount({ attachments }: Props) {
  const count = evidenceCount({ attachments });
  const breakdown =
    count === 0
      ? 'No evidence attached'
      : attachments
          .map((a) => attachmentTypeLabel(a.type))
          .join(', ');

  return (
    <Tooltip title={breakdown}>
      <Chip
        size="small"
        color={count === 0 ? 'warning' : 'default'}
        variant={count === 0 ? 'filled' : 'outlined'}
        label={`${count} evidence`}
        data-testid="expense-evidence-count"
        data-count={String(count)}
      />
    </Tooltip>
  );
}
