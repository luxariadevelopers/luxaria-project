import {
  AccountingPeriodStatus,
  PeriodChecklistItemStatus,
  type PublicAccountingPeriod,
} from './types';

export type LockGateResult =
  | { ok: true }
  | { ok: false; reason: string; failedCount: number };

/**
 * Client gate mirroring Nest `lockPeriod`:
 * - period must be open
 * - `validationPassed` must be true
 * - no checklist items with status `failed`
 */
export function canLockPeriod(
  period: Pick<
    PublicAccountingPeriod,
    'status' | 'validationPassed' | 'checklist'
  > | null | undefined,
): LockGateResult {
  if (!period) {
    return { ok: false, reason: 'Select a period to lock.', failedCount: 0 };
  }
  if (period.status !== AccountingPeriodStatus.Open) {
    return {
      ok: false,
      reason: 'Only open periods can be locked.',
      failedCount: 0,
    };
  }
  if (!period.validationPassed) {
    return {
      ok: false,
      reason:
        'Run pre-close validation and resolve all checklist failures before locking.',
      failedCount: 0,
    };
  }
  const failed = (period.checklist ?? []).filter(
    (c) => c.status === PeriodChecklistItemStatus.Failed,
  );
  if (failed.length > 0) {
    return {
      ok: false,
      reason: `Cannot lock period: ${failed.length} checklist item(s) failed`,
      failedCount: failed.length,
    };
  }
  return { ok: true };
}

export function blockingChecklistItems(
  period: Pick<PublicAccountingPeriod, 'checklist'> | null | undefined,
) {
  return (period?.checklist ?? []).filter(
    (c) => c.status === PeriodChecklistItemStatus.Failed,
  );
}
