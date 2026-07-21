import { BadRequestException } from '@nestjs/common';
import {
  PaymentScheduleLineStatus,
  PaymentScheduleType,
} from './schemas/payment-schedule.schema';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPercent(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export type ScheduleLineInput = {
  sequence: number;
  milestone: string;
  milestoneCode?: string | null;
  dueDate?: string | Date | null;
  percentage: number;
  amount: number;
  tax?: number;
};

/** Canonical construction-linked demand milestones (Phase 7 ↔ Phase 5). */
export const CONSTRUCTION_MILESTONE_CODES = [
  'booking',
  'foundation',
  'basement',
  'floor_complete',
  'roof',
  'brickwork',
  'plastering',
  'finishing',
  'possession',
  'registration',
] as const;

export type ConstructionMilestoneCode =
  (typeof CONSTRUCTION_MILESTONE_CODES)[number];

export function normalizeMilestoneCode(
  value?: string | null,
): string | null {
  if (!value?.trim()) return null;
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function assertScheduleLines(
  scheduleType: PaymentScheduleType,
  lines: ScheduleLineInput[],
  totalAmount: number,
): void {
  if (!lines.length) {
    throw new BadRequestException('At least one schedule line is required');
  }

  let amountSum = 0;
  let percentSum = 0;
  const sequences = new Set<number>();

  for (const line of lines) {
    if (!Number.isFinite(line.sequence) || line.sequence < 1) {
      throw new BadRequestException('Each line sequence must be ≥ 1');
    }
    if (sequences.has(line.sequence)) {
      throw new BadRequestException(
        `Duplicate schedule line sequence ${line.sequence}`,
      );
    }
    sequences.add(line.sequence);

    if (!line.milestone?.trim()) {
      throw new BadRequestException('Each line requires a milestone label');
    }
    if (!Number.isFinite(line.amount) || line.amount < 0) {
      throw new BadRequestException('Each line amount must be ≥ 0');
    }
    if (!Number.isFinite(line.percentage) || line.percentage < 0) {
      throw new BadRequestException('Each line percentage must be ≥ 0');
    }
    if (line.tax != null && (!Number.isFinite(line.tax) || line.tax < 0)) {
      throw new BadRequestException('Each line tax must be ≥ 0');
    }

    assertLineFitsScheduleType(scheduleType, line);
    amountSum += line.amount;
    percentSum += line.percentage;
  }

  amountSum = roundMoney(amountSum);
  percentSum = roundPercent(percentSum);

  if (Math.abs(amountSum - totalAmount) > 0.009) {
    throw new BadRequestException(
      `Schedule line amounts (${amountSum}) must equal totalAmount (${totalAmount})`,
    );
  }

  if (Math.abs(percentSum - 100) > 0.01) {
    throw new BadRequestException(
      `Schedule line percentages (${percentSum}) must total 100`,
    );
  }
}

export function assertLineFitsScheduleType(
  scheduleType: PaymentScheduleType,
  line: ScheduleLineInput,
): void {
  const hasDueDate = line.dueDate != null && String(line.dueDate).trim() !== '';

  if (scheduleType === PaymentScheduleType.DateBased && !hasDueDate) {
    throw new BadRequestException(
      'date_based schedules require dueDate on every line',
    );
  }

  if (
    scheduleType === PaymentScheduleType.BankDisbursement &&
    !line.milestone?.trim()
  ) {
    throw new BadRequestException(
      'bank_disbursement schedules require a milestone (disbursement stage)',
    );
  }

  if (
    scheduleType === PaymentScheduleType.ConstructionMilestone &&
    !line.milestone?.trim()
  ) {
    throw new BadRequestException(
      'construction_milestone schedules require a milestone',
    );
  }
}

export function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function isLineOverdue(input: {
  status: PaymentScheduleLineStatus;
  dueDate: Date | null;
  asOf?: Date;
}): boolean {
  if (
    input.status === PaymentScheduleLineStatus.Paid ||
    input.status === PaymentScheduleLineStatus.Waived
  ) {
    return false;
  }
  if (!input.dueDate) return false;
  const asOf = startOfUtcDay(input.asOf ?? new Date());
  const due = startOfUtcDay(input.dueDate);
  return (
    due < asOf &&
    (input.status === PaymentScheduleLineStatus.Pending ||
      input.status === PaymentScheduleLineStatus.Due ||
      input.status === PaymentScheduleLineStatus.Demanded ||
      input.status === PaymentScheduleLineStatus.Overdue)
  );
}

export function canMarkDue(status: PaymentScheduleLineStatus): boolean {
  return (
    status === PaymentScheduleLineStatus.Pending ||
    status === PaymentScheduleLineStatus.Overdue
  );
}

export function canGenerateDemand(status: PaymentScheduleLineStatus): boolean {
  // Demand requires mark-due first (Pending lines are not billable yet).
  return (
    status === PaymentScheduleLineStatus.Due ||
    status === PaymentScheduleLineStatus.Overdue
  );
}
