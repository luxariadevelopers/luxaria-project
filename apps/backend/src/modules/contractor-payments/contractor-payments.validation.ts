import { BadRequestException } from '@nestjs/common';
import {
  computeRemainingBillPayable,
  roundMoney,
} from '../contractor-bills/contractor-bills.validation';

export { computeRemainingBillPayable, roundMoney };

export function normalizeTransactionReference(value: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BadRequestException(
      'transactionReference (transaction ID) is required',
    );
  }
  if (normalized.length < 3) {
    throw new BadRequestException(
      'transactionReference must be at least 3 characters',
    );
  }
  return normalized;
}

export function computeBankAmount(input: {
  amount: number;
  tds: number;
  retention: number;
  advanceRecovery: number;
  penalty: number;
}): number {
  const withholdings = roundMoney(
    input.tds + input.retention + input.advanceRecovery + input.penalty,
  );
  const bank = roundMoney(input.amount - withholdings);
  if (bank < -1e-9) {
    throw new BadRequestException(
      'TDS + retention + advanceRecovery + penalty cannot exceed payment amount',
    );
  }
  return Math.max(0, bank);
}

export function assertAllocationsBalance(input: {
  amount: number;
  allocations: Array<{ amount: number }>;
}): void {
  if (!input.allocations?.length) {
    throw new BadRequestException('At least one bill allocation is required');
  }
  const sum = roundMoney(
    input.allocations.reduce((s, a) => s + (a.amount ?? 0), 0),
  );
  if (Math.abs(sum - roundMoney(input.amount)) > 0.005) {
    throw new BadRequestException(
      `Allocation total (${sum}) must equal payment amount (${input.amount})`,
    );
  }
  for (const a of input.allocations) {
    if (!Number.isFinite(a.amount) || a.amount <= 0) {
      throw new BadRequestException('Each allocation amount must be > 0');
    }
  }
}
