import { computeMaterialReconciliationMetrics } from './material-reconciliation.validation';

describe('computeMaterialReconciliationMetrics', () => {
  it('applies Issued − Theoretical − ApprovedWastage − Returned', () => {
    // 100 issued − 80 theoretical − 5 wastage − 10 returned = 5 recoverable
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: 100,
      theoreticalConsumption: 80,
      approvedWastage: 5,
      returnedQuantity: 10,
      unitRate: 400,
    });

    expect(metrics.recoverableDifference).toBe(5);
    expect(metrics.recoveryAmount).toBe(2000); // 5 × 400
  });

  it('values only positive recoverable difference', () => {
    // 50 − 60 − 0 − 0 = −10 → recoveryAmount 0
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: 50,
      theoreticalConsumption: 60,
      approvedWastage: 0,
      returnedQuantity: 0,
      unitRate: 100,
    });

    expect(metrics.recoverableDifference).toBe(-10);
    expect(metrics.recoveryAmount).toBe(0);
  });

  it('handles zero issued with returns as negative difference', () => {
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: 0,
      theoreticalConsumption: 0,
      approvedWastage: 0,
      returnedQuantity: 3,
      unitRate: 50,
    });

    expect(metrics.recoverableDifference).toBe(-3);
    expect(metrics.recoveryAmount).toBe(0);
  });

  it('rounds money to 2 decimals', () => {
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: 1,
      theoreticalConsumption: 0,
      approvedWastage: 0,
      returnedQuantity: 0,
      unitRate: 33.333,
    });

    expect(metrics.unitRate).toBe(33.33);
    expect(metrics.recoveryAmount).toBe(33.33);
  });

  it('rounds quantities to 6 decimals', () => {
    const metrics = computeMaterialReconciliationMetrics({
      issuedQuantity: 1.1234567,
      theoreticalConsumption: 0.1,
      approvedWastage: 0.01,
      returnedQuantity: 0.001,
      unitRate: 1,
    });

    expect(metrics.issuedQuantity).toBe(1.123457);
    expect(metrics.recoverableDifference).toBe(
      // 1.123457 − 0.1 − 0.01 − 0.001
      1.012457,
    );
  });
});
