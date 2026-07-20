/** Mirrors Nest `PERCENT_TOLERANCE` in shareholding.validation.ts */
export const SHAREHOLDING_PERCENT_TOLERANCE = 0.0001;

export type TotalPercentageStatus = 'balanced' | 'under' | 'over' | 'empty';

export type TotalPercentageAssessment = {
  total: number;
  status: TotalPercentageStatus;
  /** Human message for the indicator. */
  message: string;
  isValid: boolean;
};

/**
 * Active shareholding must total 100% (Nest `assertShareholdingTotals100`).
 * Display-only assessment — server remains authoritative on propose/approve.
 */
export function assessTotalPercentage(total: number): TotalPercentageAssessment {
  if (!Number.isFinite(total) || total <= 0) {
    return {
      total: Number.isFinite(total) ? total : 0,
      status: 'empty',
      message: 'No active holdings to validate against 100%.',
      isValid: false,
    };
  }

  const delta = total - 100;
  if (Math.abs(delta) <= SHAREHOLDING_PERCENT_TOLERANCE) {
    return {
      total,
      status: 'balanced',
      message: 'Active total is 100% (balanced).',
      isValid: true,
    };
  }
  if (delta < 0) {
    return {
      total,
      status: 'under',
      message: `Active total is ${total.toFixed(4)}% — must equal 100%.`,
      isValid: false,
    };
  }
  return {
    total,
    status: 'over',
    message: `Active total is ${total.toFixed(4)}% — must equal 100%.`,
    isValid: false,
  };
}

export function sumHoldingPercentages(
  holdings: readonly { percentage: number }[],
): number {
  return holdings.reduce(
    (sum, row) => sum + (Number.isFinite(row.percentage) ? row.percentage : 0),
    0,
  );
}
