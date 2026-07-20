import { computeApprovalAgeing } from './ageing';
import type { PublicApprovalRequest } from './types';
import type { ValidatedApprovalListQuery } from './validateFilters';

/**
 * Client-only filters. Nest list query has no amount/ageing params —
 * apply after load (see ApprovalsPage when client filters are active).
 */
export function applyApprovalClientFilters(
  items: readonly PublicApprovalRequest[],
  client: ValidatedApprovalListQuery['client'],
  now?: Date,
): PublicApprovalRequest[] {
  return items.filter((item) => {
    if (client.minAmount != null && item.amount < client.minAmount) {
      return false;
    }
    if (client.maxAmount != null && item.amount > client.maxAmount) {
      return false;
    }
    if (client.ageing != null) {
      const ageing = computeApprovalAgeing({
        stepEnteredAt: item.stepEnteredAt,
        requestedAt: item.requestedAt,
        escalated: item.escalated,
        now,
      });
      if (ageing.level !== client.ageing) {
        return false;
      }
    }
    return true;
  });
}

export function hasApprovalClientFilters(
  client: ValidatedApprovalListQuery['client'],
): boolean {
  return (
    client.minAmount != null ||
    client.maxAmount != null ||
    client.ageing != null
  );
}
