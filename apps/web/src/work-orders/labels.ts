import type {
  WorkOrderAmendmentStatus,
  WorkOrderAmendmentType,
  WorkOrderResponsibility,
  WorkOrderStatus,
} from './types';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  issued: 'Issued',
  accepted: 'Accepted',
  in_progress: 'In progress',
  partially_completed: 'Partially completed',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export function workOrderStatusLabel(status: WorkOrderStatus): string {
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

export const WORK_ORDER_STATUS_OPTIONS = (
  Object.keys(STATUS_LABELS) as WorkOrderStatus[]
).map((value) => ({
  value,
  label: workOrderStatusLabel(value),
}));

const AMENDMENT_TYPE_LABELS: Record<WorkOrderAmendmentType, string> = {
  quantity: 'Quantity',
  rate: 'Rate',
  scope: 'Scope',
  time_extension: 'Time extension',
  revised_value: 'Revised value',
  mixed: 'Mixed',
};

export function amendmentTypeLabel(type: WorkOrderAmendmentType): string {
  return AMENDMENT_TYPE_LABELS[type] ?? type;
}

export const AMENDMENT_TYPE_OPTIONS = (
  Object.keys(AMENDMENT_TYPE_LABELS) as WorkOrderAmendmentType[]
).map((value) => ({
  value,
  label: amendmentTypeLabel(value),
}));

const AMENDMENT_STATUS_LABELS: Record<WorkOrderAmendmentStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function amendmentStatusLabel(
  status: WorkOrderAmendmentStatus,
): string {
  return AMENDMENT_STATUS_LABELS[status] ?? status.replaceAll('_', ' ');
}

const RESPONSIBILITY_LABELS: Record<WorkOrderResponsibility, string> = {
  company: 'Company',
  contractor: 'Contractor',
  shared: 'Shared',
};

export function responsibilityLabel(
  value: WorkOrderResponsibility,
): string {
  return RESPONSIBILITY_LABELS[value] ?? value;
}

export const RESPONSIBILITY_OPTIONS = (
  Object.keys(RESPONSIBILITY_LABELS) as WorkOrderResponsibility[]
).map((value) => ({
  value,
  label: responsibilityLabel(value),
}));
