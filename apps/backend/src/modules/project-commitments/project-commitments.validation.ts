import { BadRequestException } from '@nestjs/common';

export type PaymentScheduleInput = {
  dueDate: string | Date;
  amount: number;
  label?: string | null;
};

/** Commitment amount cannot be less than already received. */
export function assertCommitmentNotBelowReceived(
  commitmentAmount: number,
  receivedAmount: number,
): void {
  if (!Number.isFinite(commitmentAmount) || commitmentAmount < 0) {
    throw new BadRequestException('commitmentAmount must be a non-negative number');
  }
  if (commitmentAmount < receivedAmount) {
    throw new BadRequestException(
      `Commitment amount (${commitmentAmount}) cannot be less than already received amount (${receivedAmount})`,
    );
  }
}

export function assertPaymentSchedule(
  schedule: PaymentScheduleInput[] | undefined,
  commitmentAmount: number,
): void {
  if (!schedule?.length) return;

  let total = 0;
  for (const line of schedule) {
    if (!Number.isFinite(line.amount) || line.amount < 0) {
      throw new BadRequestException(
        'Each payment schedule amount must be a non-negative number',
      );
    }
    total += line.amount;
  }

  if (Math.abs(total - commitmentAmount) > 0.0001) {
    throw new BadRequestException(
      `Payment schedule total (${total}) must equal commitmentAmount (${commitmentAmount})`,
    );
  }
}

export function assertPositiveReceipt(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Receipt amount must be greater than zero');
  }
}

/**
 * Placeholder for future overdue commitment alerts.
 * Intentionally no-op until the notifications module is wired.
 */
export function evaluateOverdueCommitmentAlerts(_input: {
  dueDate: Date | null;
  pendingAmount: number;
  status: string;
}): void {
  // TODO(overdue-alerts): emit notifications when dueDate < today && pendingAmount > 0
}
