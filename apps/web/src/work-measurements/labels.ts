import { boqUnitLabel } from '@/boq/labels';
import type { BoqUnit } from '@/boq/types';
import {
  WorkMeasurementStatus,
  type WorkMeasurementStatus as Status,
} from './types';

export function workMeasurementStatusLabel(status: string): string {
  switch (status) {
    case WorkMeasurementStatus.Draft:
      return 'Draft';
    case WorkMeasurementStatus.Submitted:
      return 'Submitted';
    case WorkMeasurementStatus.Verified:
      return 'Verified';
    case WorkMeasurementStatus.Certified:
      return 'Certified';
    case WorkMeasurementStatus.Rejected:
      return 'Rejected';
    case WorkMeasurementStatus.Cancelled:
      return 'Cancelled';
    default:
      return status;
  }
}

export function workMeasurementUnitLabel(unit: BoqUnit | string): string {
  return boqUnitLabel(unit as BoqUnit);
}

export const WORK_MEASUREMENT_STATUS_OPTIONS: Array<{
  value: Status | '';
  label: string;
}> = [
  { value: '', label: 'All statuses' },
  {
    value: WorkMeasurementStatus.Draft,
    label: workMeasurementStatusLabel(WorkMeasurementStatus.Draft),
  },
  {
    value: WorkMeasurementStatus.Submitted,
    label: workMeasurementStatusLabel(WorkMeasurementStatus.Submitted),
  },
  {
    value: WorkMeasurementStatus.Verified,
    label: workMeasurementStatusLabel(WorkMeasurementStatus.Verified),
  },
  {
    value: WorkMeasurementStatus.Certified,
    label: workMeasurementStatusLabel(WorkMeasurementStatus.Certified),
  },
  {
    value: WorkMeasurementStatus.Rejected,
    label: workMeasurementStatusLabel(WorkMeasurementStatus.Rejected),
  },
  {
    value: WorkMeasurementStatus.Cancelled,
    label: workMeasurementStatusLabel(WorkMeasurementStatus.Cancelled),
  },
];
