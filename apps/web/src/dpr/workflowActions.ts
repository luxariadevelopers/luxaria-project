import { DprStatus, type DprDetailActionId, type PublicDailyProgressReport } from './types';
import type { DprCapabilities } from './roleAccess';

export function resolveDprRowActions(
  dpr: Pick<PublicDailyProgressReport, 'status'>,
  caps: DprCapabilities,
): DprDetailActionId[] {
  const actions: DprDetailActionId[] = [];

  if (caps.canReview && dpr.status === DprStatus.Submitted) {
    actions.push('review');
  }

  if (
    caps.canReopen &&
    (dpr.status === DprStatus.Submitted || dpr.status === DprStatus.Reviewed)
  ) {
    actions.push('reopen');
  }

  if (
    caps.canRegeneratePdf &&
    (dpr.status === DprStatus.Submitted || dpr.status === DprStatus.Reviewed)
  ) {
    actions.push('regenerate_pdf');
  }

  return actions;
}
