/**
 * Material reconciliation formula (CTR-architecture):
 *
 *   Issued − Theoretical − ApprovedWastage − Returned = RecoverableDifference
 *
 * recoveryAmount = max(0, RecoverableDifference) × unitRate
 */

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type MaterialReconciliationMetricsInput = {
  issuedQuantity: number;
  theoreticalConsumption: number;
  approvedWastage: number;
  returnedQuantity: number;
  unitRate: number;
};

export type MaterialReconciliationMetrics = {
  issuedQuantity: number;
  theoreticalConsumption: number;
  approvedWastage: number;
  returnedQuantity: number;
  recoverableDifference: number;
  unitRate: number;
  recoveryAmount: number;
};

export function computeMaterialReconciliationMetrics(
  input: MaterialReconciliationMetricsInput,
): MaterialReconciliationMetrics {
  const issuedQuantity = roundQty(input.issuedQuantity);
  const theoreticalConsumption = roundQty(input.theoreticalConsumption);
  const approvedWastage = roundQty(input.approvedWastage);
  const returnedQuantity = roundQty(input.returnedQuantity);
  const unitRate = roundMoney(input.unitRate);

  const recoverableDifference = roundQty(
    issuedQuantity -
      theoreticalConsumption -
      approvedWastage -
      returnedQuantity,
  );

  const recoveryAmount = roundMoney(
    Math.max(0, recoverableDifference) * unitRate,
  );

  return {
    issuedQuantity,
    theoreticalConsumption,
    approvedWastage,
    returnedQuantity,
    recoverableDifference,
    unitRate,
    recoveryAmount,
  };
}
