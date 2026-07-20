/**
 * Mirrors Nest `PERCENT_TOLERANCE` /
 * `assertActiveProfitShareTotals100` in project-participants.validation.ts.
 */
export const PROFIT_SHARE_PERCENT_TOLERANCE = 0.0001;

export type ProfitShareTotalStatus = 'balanced' | 'under' | 'over' | 'empty';

export type ProfitShareTotalAssessment = {
  total: number;
  status: ProfitShareTotalStatus;
  message: string;
  isBalanced: boolean;
};

/**
 * Display assessment of active approved project profit-share total.
 * Server remains authoritative for finalize.
 */
export function assessProfitShareTotal(
  total: number,
): ProfitShareTotalAssessment {
  if (!Number.isFinite(total) || total <= 0) {
    return {
      total: Number.isFinite(total) ? total : 0,
      status: 'empty',
      message:
        'No active approved profit shares yet. Finalisation requires a 100% total.',
      isBalanced: false,
    };
  }

  const delta = total - 100;
  if (Math.abs(delta) <= PROFIT_SHARE_PERCENT_TOLERANCE) {
    return {
      total,
      status: 'balanced',
      message: 'Active project profit-share total is 100%.',
      isBalanced: true,
    };
  }

  if (delta < 0) {
    return {
      total,
      status: 'under',
      message: `Active profit-share total is ${total.toFixed(4)}% — must equal 100% before finalisation.`,
      isBalanced: false,
    };
  }

  return {
    total,
    status: 'over',
    message: `Active profit-share total is ${total.toFixed(4)}% — must equal 100% before finalisation.`,
    isBalanced: false,
  };
}

export function sumProfitSharePercentages(
  rows: readonly { approvedProfitSharePercentage: number }[],
): number {
  return rows.reduce(
    (sum, row) =>
      sum +
      (Number.isFinite(row.approvedProfitSharePercentage)
        ? row.approvedProfitSharePercentage
        : 0),
    0,
  );
}
