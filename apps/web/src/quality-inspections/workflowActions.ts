import type { QualityInspectionCapabilities } from './roleAccess';
import {
  QualityInspectionStatus,
  type PublicQualityInspection,
} from './types';

export type QualityInspectionRowActionId = 'complete' | 'cancel' | 'edit';

/**
 * Status + permission gate for list / detail actions.
 * Nest still enforces transitions; complete records the quality result.
 */
export function resolveQualityInspectionRowActions(
  row: PublicQualityInspection,
  caps: QualityInspectionCapabilities,
): QualityInspectionRowActionId[] {
  const actions: QualityInspectionRowActionId[] = [];
  const open =
    row.status === QualityInspectionStatus.Draft ||
    row.status === QualityInspectionStatus.InProgress;

  if (open && caps.canInspect) {
    actions.push('edit', 'complete');
  }
  if (
    caps.canInspect &&
    row.status !== QualityInspectionStatus.Completed &&
    row.status !== QualityInspectionStatus.Cancelled
  ) {
    actions.push('cancel');
  }

  return actions;
}
