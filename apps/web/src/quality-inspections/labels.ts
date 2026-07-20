import {
  QualityInspectionResult,
  QualityInspectionStatus,
} from './types';

export function qualityInspectionStatusLabel(status: string): string {
  switch (status) {
    case QualityInspectionStatus.Draft:
      return 'Draft';
    case QualityInspectionStatus.InProgress:
      return 'In progress';
    case QualityInspectionStatus.Completed:
      return 'Completed';
    case QualityInspectionStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function qualityInspectionResultLabel(result: string | null): string {
  if (!result) return '—';
  switch (result) {
    case QualityInspectionResult.Accepted:
      return 'Accepted';
    case QualityInspectionResult.PartiallyAccepted:
      return 'Partially accepted';
    case QualityInspectionResult.Rejected:
      return 'Rejected';
    case QualityInspectionResult.Hold:
      return 'Hold';
    default:
      return result;
  }
}

export function grnStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'quality_check':
      return 'Quality check';
    default:
      return status;
  }
}
