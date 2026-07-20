import type { ScheduleAllocationInput } from './types';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Client preview of Nest `assertAllocationTotals`.
 * Remainder becomes unallocated advance; over-allocation is rejected.
 */
export function computeAllocationTotals(input: {
  amount: number;
  allocations: ReadonlyArray<Pick<ScheduleAllocationInput, 'amount'>>;
}):
  | {
      ok: true;
      allocatedAmount: number;
      unallocatedAmount: number;
    }
  | { ok: false; message: string } {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, message: 'amount must be greater than zero' };
  }

  let allocatedAmount = 0;
  for (const line of input.allocations) {
    if (!Number.isFinite(line.amount) || line.amount <= 0) {
      return {
        ok: false,
        message: 'Each scheduleAllocation amount must be greater than zero',
      };
    }
    allocatedAmount += line.amount;
  }
  allocatedAmount = roundMoney(allocatedAmount);

  if (allocatedAmount - input.amount > 0.009) {
    return {
      ok: false,
      message: `Allocated amount (${allocatedAmount}) cannot exceed receipt amount (${input.amount})`,
    };
  }

  return {
    ok: true,
    allocatedAmount,
    unallocatedAmount: roundMoney(input.amount - allocatedAmount),
  };
}

export function remainingOnDemandLine(input: {
  amount: number;
  tax: number;
  collectedAmount: number;
}): number {
  return roundMoney(
    input.amount + input.tax - (input.collectedAmount ?? 0),
  );
}
