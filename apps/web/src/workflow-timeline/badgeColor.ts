import type { ChipProps } from '@mui/material';
import type { StatusBadgeVariant } from '@luxaria/shared-types';
import {
  getDomainStatusDisplay,
  type DomainStatusKey,
} from '@/status';

const VARIANT_TO_COLOR: Record<
  StatusBadgeVariant,
  NonNullable<ChipProps['color']>
> = {
  neutral: 'default',
  info: 'info',
  warning: 'warning',
  success: 'success',
  danger: 'error',
  muted: 'default',
};

/** Map a known domain status (or unknown string) to an MUI Chip color. */
export function statusChipColor(
  status: string | null | undefined,
  domainKey?: DomainStatusKey,
): NonNullable<ChipProps['color']> {
  if (!status) {
    return 'default';
  }
  if (domainKey) {
    const domain = getDomainStatusDisplay(domainKey, status);
    if (domain.known) {
      return VARIANT_TO_COLOR[domain.badgeVariant];
    }
  }
  const approval = getDomainStatusDisplay('approval', status);
  if (approval.known) {
    return VARIANT_TO_COLOR[approval.badgeVariant];
  }
  return 'default';
}

export function actionChipColor(
  action: string,
): NonNullable<ChipProps['color']> {
  switch (action) {
    case 'approved':
    case 'APPROVE':
    case 'POST':
      return 'success';
    case 'rejected':
    case 'REJECT':
    case 'DELETE':
      return 'error';
    case 'returned':
    case 'escalated':
    case 'submitted':
    case 'UPDATE':
      return 'warning';
    case 'cancelled':
    case 'REVERSE':
      return 'default';
    default:
      return 'info';
  }
}
