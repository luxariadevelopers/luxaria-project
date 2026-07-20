import {
  assessProfitShareTotal,
  PROFIT_SHARE_PERCENT_TOLERANCE,
} from '@/project-participants/profitShareTotal';
import type { AllocationLine } from './buildAllocationSchedule';
import { sumProposedProfitShare } from './buildAllocationSchedule';

export type AllocationValidation = {
  total: number;
  isBalanced: boolean;
  hasNegative: boolean;
  hasOverCap: boolean;
  canSubmit: boolean;
  message: string;
};

/**
 * Client gate before submitting draft versions.
 * Backend finalize also requires 100%; submit itself does not — we still block
 * schedule submission when the proposed active total would not be 100%.
 */
export function validateProposedAllocation(
  lines: readonly AllocationLine[],
): AllocationValidation {
  const total = sumProposedProfitShare(lines);
  const assessed = assessProfitShareTotal(total);

  const hasNegative = lines.some(
    (line) =>
      line.proposedProfitShare < 0 ||
      line.proposedLossShare < 0 ||
      !Number.isFinite(line.proposedProfitShare) ||
      !Number.isFinite(line.proposedLossShare),
  );

  const hasOverCap = lines.some(
    (line) =>
      line.proposedProfitShare > 100 + PROFIT_SHARE_PERCENT_TOLERANCE ||
      line.proposedLossShare > 100 + PROFIT_SHARE_PERCENT_TOLERANCE,
  );

  const hasDrafts = lines.some((line) => line.isEditable);
  const canSubmit =
    hasDrafts &&
    !hasNegative &&
    !hasOverCap &&
    assessed.isBalanced;

  let message = assessed.message;
  if (hasNegative) {
    message = 'Percentages cannot be negative.';
  } else if (hasOverCap) {
    message = 'Each percentage must be between 0 and 100.';
  } else if (!hasDrafts) {
    message =
      'Create a revision (new draft versions) before submitting profit-share changes.';
  } else if (!assessed.isBalanced) {
    message = `Proposed total is ${total.toFixed(4)}% — must equal 100% before submission.`;
  }

  return {
    total,
    isBalanced: assessed.isBalanced,
    hasNegative,
    hasOverCap,
    canSubmit,
    message,
  };
}

export function isValidPercentInput(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}
