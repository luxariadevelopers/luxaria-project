import type { PaymentScheduleCapabilities } from './roleAccess';
import {
  PaymentScheduleLineStatus,
  PaymentScheduleStatus,
  type PublicPaymentSchedule,
  type PublicPaymentScheduleLine,
} from './types';

export function canSubmitSchedule(
  schedule: PublicPaymentSchedule,
  caps: PaymentScheduleCapabilities,
): boolean {
  return (
    caps.canCreate &&
    (schedule.status === PaymentScheduleStatus.Draft ||
      schedule.status === PaymentScheduleStatus.Rejected)
  );
}

export function canApproveSchedule(
  schedule: PublicPaymentSchedule,
  caps: PaymentScheduleCapabilities,
): boolean {
  return (
    caps.canApprove &&
    schedule.status === PaymentScheduleStatus.PendingApproval
  );
}

export function canRejectSchedule(
  schedule: PublicPaymentSchedule,
  caps: PaymentScheduleCapabilities,
): boolean {
  return canApproveSchedule(schedule, caps);
}

export function canReviseSchedule(
  schedule: PublicPaymentSchedule,
  caps: PaymentScheduleCapabilities,
): boolean {
  return caps.canCreate && schedule.status === PaymentScheduleStatus.Active;
}

export function isScheduleActive(schedule: PublicPaymentSchedule): boolean {
  return schedule.status === PaymentScheduleStatus.Active;
}

export function canMarkLineDue(
  schedule: PublicPaymentSchedule,
  line: PublicPaymentScheduleLine,
  caps: PaymentScheduleCapabilities,
): boolean {
  if (!caps.canCreate || !isScheduleActive(schedule)) return false;
  return (
    line.status === PaymentScheduleLineStatus.Pending ||
    line.status === PaymentScheduleLineStatus.Overdue
  );
}

export function canGenerateLineDemand(
  schedule: PublicPaymentSchedule,
  line: PublicPaymentScheduleLine,
  caps: PaymentScheduleCapabilities,
): boolean {
  if (!caps.canCreate || !isScheduleActive(schedule)) return false;
  if (line.demandId) return false;
  return (
    line.status === PaymentScheduleLineStatus.Due ||
    line.status === PaymentScheduleLineStatus.Overdue
  );
}

export function canRunMarkOverdueJob(
  caps: PaymentScheduleCapabilities,
): boolean {
  return caps.canApprove;
}
