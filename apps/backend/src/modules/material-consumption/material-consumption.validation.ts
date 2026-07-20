import { BadRequestException } from '@nestjs/common';

export enum MaterialConsumptionAlert {
  AboveAllowedVariance = 'above_allowed_variance',
  NegativeConsumption = 'negative_consumption',
  MaterialIssueWithoutProgress = 'material_issue_without_progress',
  ProgressWithoutMaterialIssue = 'progress_without_material_issue',
  UnexplainedStockShortage = 'unexplained_stock_shortage',
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

export function percentVariance(actual: number, expected: number): number {
  if (Math.abs(expected) < 1e-9) {
    return Math.abs(actual) < 1e-9 ? 0 : 100;
  }
  return roundPct((Math.abs(actual - expected) / Math.abs(expected)) * 100);
}

export type ConsumptionMetricsInput = {
  workQuantityCompleted: number;
  /** Standard material qty per 1 work unit. */
  coefficient: number;
  wastagePercentage: number;
  actualMaterialIssued: number;
  materialReturned: number;
  standardRate: number;
};

export type ConsumptionMetrics = {
  workQuantityCompleted: number;
  standardMaterialRequirement: number;
  allowedWastage: number;
  expectedConsumption: number;
  actualMaterialIssued: number;
  materialReturned: number;
  netActualConsumption: number;
  varianceQuantity: number;
  variancePercentage: number;
  varianceValue: number;
};

export function computeConsumptionMetrics(
  input: ConsumptionMetricsInput,
): ConsumptionMetrics {
  const workQuantityCompleted = roundQty(input.workQuantityCompleted);
  const standardMaterialRequirement = roundQty(
    workQuantityCompleted * input.coefficient,
  );
  const allowedWastage = roundQty(
    standardMaterialRequirement * (input.wastagePercentage / 100),
  );
  const expectedConsumption = roundQty(
    standardMaterialRequirement + allowedWastage,
  );
  const actualMaterialIssued = roundQty(input.actualMaterialIssued);
  const materialReturned = roundQty(input.materialReturned);
  const netActualConsumption = roundQty(
    actualMaterialIssued - materialReturned,
  );
  const varianceQuantity = roundQty(
    netActualConsumption - expectedConsumption,
  );
  const variancePercentage = percentVariance(
    netActualConsumption,
    expectedConsumption,
  );
  const varianceValue = roundMoney(varianceQuantity * input.standardRate);

  return {
    workQuantityCompleted,
    standardMaterialRequirement,
    allowedWastage,
    expectedConsumption,
    actualMaterialIssued,
    materialReturned,
    netActualConsumption,
    varianceQuantity,
    variancePercentage,
    varianceValue,
  };
}

export function evaluateConsumptionAlerts(input: {
  metrics: ConsumptionMetrics;
  /** True when a standard/coefficient expects material for this work. */
  materialRequired: boolean;
  hasUnexplainedStockShortage: boolean;
}): MaterialConsumptionAlert[] {
  const { metrics } = input;
  const alerts: MaterialConsumptionAlert[] = [];

  if (metrics.varianceQuantity > 1e-9) {
    alerts.push(MaterialConsumptionAlert.AboveAllowedVariance);
  }
  if (metrics.netActualConsumption < -1e-9) {
    alerts.push(MaterialConsumptionAlert.NegativeConsumption);
  }
  if (
    metrics.actualMaterialIssued > 1e-9 &&
    metrics.workQuantityCompleted < 1e-9
  ) {
    alerts.push(MaterialConsumptionAlert.MaterialIssueWithoutProgress);
  }
  if (
    input.materialRequired &&
    metrics.workQuantityCompleted > 1e-9 &&
    metrics.actualMaterialIssued < 1e-9
  ) {
    alerts.push(MaterialConsumptionAlert.ProgressWithoutMaterialIssue);
  }
  if (input.hasUnexplainedStockShortage) {
    alerts.push(MaterialConsumptionAlert.UnexplainedStockShortage);
  }

  return alerts;
}

export function varianceRequiresApproval(input: {
  metrics: ConsumptionMetrics;
  alerts: MaterialConsumptionAlert[];
  thresholdPercent: number;
}): boolean {
  if (input.alerts.includes(MaterialConsumptionAlert.AboveAllowedVariance)) {
    return true;
  }
  if (input.alerts.includes(MaterialConsumptionAlert.NegativeConsumption)) {
    return true;
  }
  if (
    input.alerts.includes(MaterialConsumptionAlert.UnexplainedStockShortage)
  ) {
    return true;
  }
  if (
    Math.abs(input.metrics.varianceQuantity) > 1e-9 &&
    input.metrics.variancePercentage >= input.thresholdPercent - 1e-9
  ) {
    return true;
  }
  return false;
}

export function assertVarianceExplained(input: {
  requiresApproval: boolean;
  explanation?: string | null;
}): void {
  if (!input.requiresApproval) return;
  if (!input.explanation?.trim()) {
    throw new BadRequestException(
      'Material variance requires an explanation before submit',
    );
  }
}

export function assertVarianceApprovalComment(input: {
  requiresApproval: boolean;
  approvalComment?: string | null;
}): void {
  if (!input.requiresApproval) return;
  if (!input.approvalComment?.trim()) {
    throw new BadRequestException(
      'Material variance approval requires an approval comment',
    );
  }
}

export function lineKey(boqItemId: string, materialId: string): string {
  return `${boqItemId}|${materialId}`;
}
