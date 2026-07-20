import type { CashAccountCapabilities } from './roleAccess';
import { CashAccountStatus, type PublicCashAccount } from './types';

export type CashAccountRowActionId =
  | 'transfer'
  | 'confirm_handover'
  | 'cancel_handover'
  | 'close';

/**
 * Status + permission gate for list actions.
 * Nest still enforces balance-zero close, dual handover confirm, etc.
 */
export function resolveCashAccountRowActions(
  row: PublicCashAccount,
  caps: CashAccountCapabilities,
  currentUserId?: string | null,
): CashAccountRowActionId[] {
  const actions: CashAccountRowActionId[] = [];

  if (
    row.status === CashAccountStatus.Active &&
    !row.pendingHandover &&
    caps.canManage
  ) {
    actions.push('transfer');
  }

  if (
    row.status === CashAccountStatus.PendingHandover &&
    row.pendingHandover &&
    caps.canConfirmHandover &&
    currentUserId
  ) {
    const h = row.pendingHandover;
    const isOutgoing = h.fromUserId === currentUserId;
    const isIncoming = h.toUserId === currentUserId;
    if (
      (isOutgoing && h.awaitingOutgoingConfirmation) ||
      (isIncoming && h.awaitingIncomingConfirmation)
    ) {
      actions.push('confirm_handover');
    }
  }

  if (
    row.status === CashAccountStatus.PendingHandover &&
    row.pendingHandover &&
    caps.canManage
  ) {
    actions.push('cancel_handover');
  }

  if (
    row.status !== CashAccountStatus.Closed &&
    !row.pendingHandover &&
    caps.canManage
  ) {
    actions.push('close');
  }

  return actions;
}

/**
 * Client preview: Nest rejects close when |balance| > 0.005.
 */
export function canCloseWithBalance(
  currentBalance: number | null | undefined,
): { ok: true } | { ok: false; message: string } {
  if (currentBalance == null || !Number.isFinite(currentBalance)) {
    return { ok: true };
  }
  if (Math.abs(currentBalance) > 0.005) {
    return {
      ok: false,
      message: `Cannot close cash account with non-zero balance (${currentBalance})`,
    };
  }
  return { ok: true };
}
