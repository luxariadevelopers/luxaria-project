import {
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
  PaymentScheduleType,
} from './types';

const SCHEDULE_TYPE_LABELS: Record<
  (typeof PaymentScheduleType)[keyof typeof PaymentScheduleType],
  string
> = {
  [PaymentScheduleType.DateBased]: 'Date based',
  [PaymentScheduleType.ConstructionMilestone]: 'Construction milestone',
  [PaymentScheduleType.Custom]: 'Custom',
  [PaymentScheduleType.BankDisbursement]: 'Bank disbursement',
};

const SCHEDULE_STATUS_LABELS: Record<
  (typeof PaymentScheduleStatus)[keyof typeof PaymentScheduleStatus],
  string
> = {
  [PaymentScheduleStatus.Draft]: 'Draft',
  [PaymentScheduleStatus.PendingApproval]: 'Pending approval',
  [PaymentScheduleStatus.Active]: 'Active',
  [PaymentScheduleStatus.Superseded]: 'Superseded',
  [PaymentScheduleStatus.Cancelled]: 'Cancelled',
  [PaymentScheduleStatus.Rejected]: 'Rejected',
};

const LINE_STATUS_LABELS: Record<
  (typeof PaymentScheduleLineStatus)[keyof typeof PaymentScheduleLineStatus],
  string
> = {
  [PaymentScheduleLineStatus.Pending]: 'Pending',
  [PaymentScheduleLineStatus.Due]: 'Due',
  [PaymentScheduleLineStatus.Demanded]: 'Demanded',
  [PaymentScheduleLineStatus.Overdue]: 'Overdue',
  [PaymentScheduleLineStatus.Paid]: 'Paid',
  [PaymentScheduleLineStatus.Waived]: 'Waived',
};

export function scheduleTypeLabel(type: string): string {
  return (
    SCHEDULE_TYPE_LABELS[type as keyof typeof SCHEDULE_TYPE_LABELS] ?? type
  );
}

export function scheduleStatusLabel(status: string): string {
  return (
    SCHEDULE_STATUS_LABELS[status as keyof typeof SCHEDULE_STATUS_LABELS] ??
    status
  );
}

export function lineStatusLabel(status: string): string {
  return (
    LINE_STATUS_LABELS[status as keyof typeof LINE_STATUS_LABELS] ?? status
  );
}

export { formatDate, formatInr } from '@/format';
