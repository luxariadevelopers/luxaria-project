import { DprStatus, type DprDetailActionId, type PublicDailyProgressReport } from './types';
import type { DprCapabilities } from './roleAccess';

function isApprovedLike(status: string): boolean {
  return (
    status === DprStatus.Reviewed ||
    status === DprStatus.Approved ||
    status === DprStatus.Locked
  );
}

export function resolveDprRowActions(
  dpr: Pick<PublicDailyProgressReport, 'status'>,
  caps: DprCapabilities,
): DprDetailActionId[] {
  const actions: DprDetailActionId[] = [];

  if (caps.canReview && dpr.status === DprStatus.Submitted) {
    actions.push('verify');
    actions.push('approve');
    actions.push('review');
  }

  if (caps.canReview && dpr.status === DprStatus.Verified) {
    actions.push('approve');
  }

  if (
    caps.canReview &&
    (dpr.status === DprStatus.Approved || dpr.status === DprStatus.Reviewed)
  ) {
    actions.push('lock');
  }

  if (
    caps.canReopen &&
    (dpr.status === DprStatus.Submitted ||
      dpr.status === DprStatus.Verified ||
      isApprovedLike(dpr.status))
  ) {
    actions.push('reopen');
  }

  if (
    caps.canRegeneratePdf &&
    (dpr.status === DprStatus.Submitted ||
      dpr.status === DprStatus.Verified ||
      isApprovedLike(dpr.status))
  ) {
    actions.push('regenerate_pdf');
  }

  return actions;
}
