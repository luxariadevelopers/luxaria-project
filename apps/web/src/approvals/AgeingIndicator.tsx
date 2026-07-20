import { Chip } from '@mui/material';
import {
  computeApprovalAgeing,
  type ApprovalAgeingLevel,
} from './ageing';

const COLOR: Record<
  ApprovalAgeingLevel,
  'success' | 'warning' | 'error' | 'default'
> = {
  fresh: 'success',
  aging: 'warning',
  stale: 'error',
  escalated: 'error',
};

type Props = {
  stepEnteredAt: string | null;
  requestedAt: string;
  escalated: boolean;
};

export function AgeingIndicator({
  stepEnteredAt,
  requestedAt,
  escalated,
}: Props) {
  const ageing = computeApprovalAgeing({
    stepEnteredAt,
    requestedAt,
    escalated,
  });

  return (
    <Chip
      size="small"
      color={COLOR[ageing.level]}
      variant={ageing.level === 'fresh' ? 'outlined' : 'filled'}
      label={ageing.label}
    />
  );
}
