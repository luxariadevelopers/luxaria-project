/**
 * Phase 9 cost-forecast formula baseline (immutable pure helpers).
 *
 * Estimate at Completion =
 *   Actual Cost + Committed Unbilled Cost + Forecast Remaining Cost
 */

export type CostForecastInputs = {
  originalBudget: number;
  revisedBudget: number;
  actualCost: number;
  committedUnbilledCost: number;
  /** Explicit remaining work forecast; if omitted, residual budget is used. */
  forecastRemainingCost?: number;
};

export type CostForecastResult = {
  originalBudget: number;
  revisedBudget: number;
  actualCost: number;
  committedCost: number;
  remainingCost: number;
  estimateToComplete: number;
  estimateAtCompletion: number;
  varianceAtCompletion: number;
  budgetBasis: 'revised' | 'original';
};

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function budgetBasisAmount(
  originalBudget: number,
  revisedBudget: number,
): { amount: number; basis: 'revised' | 'original' } {
  const revised = roundMoney(Math.max(0, revisedBudget));
  const original = roundMoney(Math.max(0, originalBudget));
  if (revised > 0) {
    return { amount: revised, basis: 'revised' };
  }
  return { amount: original, basis: 'original' };
}

/**
 * Residual-budget ETC when no explicit remaining forecast is supplied:
 * max(0, budget − actual − committed).
 */
export function residualForecastRemaining(
  budget: number,
  actualCost: number,
  committedUnbilledCost: number,
): number {
  return roundMoney(
    Math.max(0, budget - actualCost - committedUnbilledCost),
  );
}

export function computeCostForecast(
  input: CostForecastInputs,
): CostForecastResult {
  const originalBudget = roundMoney(Math.max(0, input.originalBudget));
  const revisedBudget = roundMoney(Math.max(0, input.revisedBudget));
  const actualCost = roundMoney(Math.max(0, input.actualCost));
  const committedCost = roundMoney(Math.max(0, input.committedUnbilledCost));
  const { amount: budget, basis } = budgetBasisAmount(
    originalBudget,
    revisedBudget,
  );

  const estimateToComplete =
    input.forecastRemainingCost !== undefined
      ? roundMoney(Math.max(0, input.forecastRemainingCost))
      : residualForecastRemaining(budget, actualCost, committedCost);

  const estimateAtCompletion = roundMoney(
    actualCost + committedCost + estimateToComplete,
  );
  const remainingCost = estimateToComplete;
  const varianceAtCompletion = roundMoney(budget - estimateAtCompletion);

  return {
    originalBudget,
    revisedBudget,
    actualCost,
    committedCost,
    remainingCost,
    estimateToComplete,
    estimateAtCompletion,
    varianceAtCompletion,
    budgetBasis: basis,
  };
}

export type CashFlowBucketInput = {
  label: string;
  periodStart: string;
  periodEnd: string;
  collections: number;
  contractorPayments: number;
  vendorPayments: number;
  payrollLabour: number;
  statutoryDues: number;
  loanInflows: number;
  loanRepayments: number;
  directorInvestorContributions: number;
};

export type CashFlowBucketResult = CashFlowBucketInput & {
  inflows: number;
  outflows: number;
  net: number;
  fundingGap: number;
};

export function computeCashFlowBucket(
  input: CashFlowBucketInput,
): CashFlowBucketResult {
  const inflows = roundMoney(
    Math.max(0, input.collections) +
      Math.max(0, input.loanInflows) +
      Math.max(0, input.directorInvestorContributions),
  );
  const outflows = roundMoney(
    Math.max(0, input.contractorPayments) +
      Math.max(0, input.vendorPayments) +
      Math.max(0, input.payrollLabour) +
      Math.max(0, input.statutoryDues) +
      Math.max(0, input.loanRepayments),
  );
  const net = roundMoney(inflows - outflows);
  return {
    ...input,
    collections: roundMoney(Math.max(0, input.collections)),
    contractorPayments: roundMoney(Math.max(0, input.contractorPayments)),
    vendorPayments: roundMoney(Math.max(0, input.vendorPayments)),
    payrollLabour: roundMoney(Math.max(0, input.payrollLabour)),
    statutoryDues: roundMoney(Math.max(0, input.statutoryDues)),
    loanInflows: roundMoney(Math.max(0, input.loanInflows)),
    loanRepayments: roundMoney(Math.max(0, input.loanRepayments)),
    directorInvestorContributions: roundMoney(
      Math.max(0, input.directorInvestorContributions),
    ),
    inflows,
    outflows,
    net,
    fundingGap: roundMoney(Math.max(0, -net)),
  };
}

export type ProjectMarginInputs = {
  revenue: number;
  estimateAtCompletion: number;
  collections: number;
};

export function computeProjectMargin(input: ProjectMarginInputs): {
  revenue: number;
  costAtCompletion: number;
  margin: number;
  marginPercent: number | null;
  collectionEfficiency: number | null;
} {
  const revenue = roundMoney(Math.max(0, input.revenue));
  const costAtCompletion = roundMoney(Math.max(0, input.estimateAtCompletion));
  const collections = roundMoney(Math.max(0, input.collections));
  const margin = roundMoney(revenue - costAtCompletion);
  const marginPercent =
    revenue > 0 ? roundMoney((margin / revenue) * 100) : null;
  const collectionEfficiency =
    revenue > 0 ? roundMoney((collections / revenue) * 100) : null;
  return {
    revenue,
    costAtCompletion,
    margin,
    marginPercent,
    collectionEfficiency,
  };
}
