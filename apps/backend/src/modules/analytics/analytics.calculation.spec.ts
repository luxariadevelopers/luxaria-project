import {
  computeCashFlowBucket,
  computeCostForecast,
  computeProjectMargin,
  residualForecastRemaining,
} from './analytics.calculation';

describe('analytics.calculation cost forecast', () => {
  it('computes EAC = actual + committed unbilled + forecast remaining', () => {
    const result = computeCostForecast({
      originalBudget: 1000,
      revisedBudget: 1200,
      actualCost: 400,
      committedUnbilledCost: 100,
      forecastRemainingCost: 500,
    });
    expect(result.estimateAtCompletion).toBe(1000);
    expect(result.estimateToComplete).toBe(500);
    expect(result.varianceAtCompletion).toBe(200);
    expect(result.budgetBasis).toBe('revised');
  });

  it('uses residual budget when forecast remaining is omitted', () => {
    expect(residualForecastRemaining(1000, 400, 100)).toBe(500);
    const result = computeCostForecast({
      originalBudget: 1000,
      revisedBudget: 0,
      actualCost: 400,
      committedUnbilledCost: 100,
    });
    expect(result.estimateToComplete).toBe(500);
    expect(result.estimateAtCompletion).toBe(1000);
    expect(result.varianceAtCompletion).toBe(0);
    expect(result.budgetBasis).toBe('original');
  });

  it('never returns negative ETC from residual method', () => {
    const result = computeCostForecast({
      originalBudget: 100,
      revisedBudget: 100,
      actualCost: 90,
      committedUnbilledCost: 30,
    });
    expect(result.estimateToComplete).toBe(0);
    expect(result.estimateAtCompletion).toBe(120);
    expect(result.varianceAtCompletion).toBe(-20);
  });
});

describe('analytics.calculation cash-flow bucket', () => {
  it('aggregates inflows, outflows, net and funding gap', () => {
    const bucket = computeCashFlowBucket({
      label: '7d',
      periodStart: '2026-07-21T00:00:00.000Z',
      periodEnd: '2026-07-28T23:59:59.999Z',
      collections: 100,
      contractorPayments: 40,
      vendorPayments: 30,
      payrollLabour: 20,
      statutoryDues: 10,
      loanInflows: 50,
      loanRepayments: 5,
      directorInvestorContributions: 25,
    });
    expect(bucket.inflows).toBe(175);
    expect(bucket.outflows).toBe(105);
    expect(bucket.net).toBe(70);
    expect(bucket.fundingGap).toBe(0);
  });

  it('reports funding gap when outflows exceed inflows', () => {
    const bucket = computeCashFlowBucket({
      label: '30d',
      periodStart: '2026-07-21T00:00:00.000Z',
      periodEnd: '2026-08-20T23:59:59.999Z',
      collections: 10,
      contractorPayments: 50,
      vendorPayments: 0,
      payrollLabour: 0,
      statutoryDues: 0,
      loanInflows: 0,
      loanRepayments: 0,
      directorInvestorContributions: 0,
    });
    expect(bucket.net).toBe(-40);
    expect(bucket.fundingGap).toBe(40);
  });
});

describe('analytics.calculation project margin', () => {
  it('computes margin and collection efficiency', () => {
    const margin = computeProjectMargin({
      revenue: 1000,
      estimateAtCompletion: 800,
      collections: 600,
    });
    expect(margin.margin).toBe(200);
    expect(margin.marginPercent).toBe(20);
    expect(margin.collectionEfficiency).toBe(60);
  });
});
