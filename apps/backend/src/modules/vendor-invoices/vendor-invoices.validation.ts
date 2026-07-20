import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  VendorInvoiceVarianceSeverity,
  VendorInvoiceVarianceType,
  type VendorInvoiceVariance,
} from './schemas/vendor-invoice.schema';

export type VarianceDraft = Omit<VendorInvoiceVariance, 'materialId'> & {
  materialId: Types.ObjectId | null;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export function normalizeInvoiceNumber(value: string): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('invoiceNumber is required');
  }
  return normalized;
}

export function assertPositiveAmount(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
}

export function assertHeaderTotals(input: {
  taxableValue: number;
  gst: number;
  freight: number;
  totalAmount: number;
  tds: number;
  retention: number;
}): void {
  assertPositiveAmount(input.taxableValue, 'taxableValue');
  assertPositiveAmount(input.gst, 'gst');
  assertPositiveAmount(input.freight, 'freight');
  assertPositiveAmount(input.totalAmount, 'totalAmount');
  assertPositiveAmount(input.tds, 'tds');
  assertPositiveAmount(input.retention, 'retention');

  const expectedGross = roundMoney(
    input.taxableValue + input.gst + input.freight,
  );
  if (Math.abs(expectedGross - roundMoney(input.totalAmount)) > 0.05) {
    throw new BadRequestException(
      `totalAmount (${input.totalAmount}) must equal taxableValue + GST + freight (${expectedGross})`,
    );
  }

  if (input.tds + input.retention - input.totalAmount > 1e-9) {
    throw new BadRequestException(
      'TDS + retention cannot exceed totalAmount',
    );
  }
}

export function computeLineAmount(input: {
  quantity: number;
  rate: number;
  tax?: number;
}): number {
  return roundMoney(input.quantity * input.rate + (input.tax ?? 0));
}

export function percentVariance(actual: number, expected: number): number {
  if (Math.abs(expected) < 1e-9) {
    return Math.abs(actual) < 1e-9 ? 0 : 100;
  }
  return roundQty((Math.abs(actual - expected) / Math.abs(expected)) * 100);
}

export function buildQuantityVariance(input: {
  materialId: string | null;
  invoicedQty: number;
  grnAcceptedQty: number;
  tolerancePercent: number;
}): VarianceDraft | null {
  const variance = roundQty(input.invoicedQty - input.grnAcceptedQty);
  if (Math.abs(variance) < 1e-9) return null;

  const pct = percentVariance(input.invoicedQty, input.grnAcceptedQty);
  const overInvoice = variance > 0;
  const withinTolerance = pct <= input.tolerancePercent + 1e-9;

  return {
    type: VendorInvoiceVarianceType.Quantity,
    materialId:
      input.materialId && Types.ObjectId.isValid(input.materialId)
        ? new Types.ObjectId(input.materialId)
        : null,
    message: overInvoice
      ? `Invoice qty ${input.invoicedQty} exceeds GRN accepted ${input.grnAcceptedQty} (${pct}%)`
      : `Invoice qty ${input.invoicedQty} is below GRN accepted ${input.grnAcceptedQty} (${pct}%)`,
    expected: input.grnAcceptedQty,
    actual: input.invoicedQty,
    severity:
      overInvoice && !withinTolerance
        ? VendorInvoiceVarianceSeverity.Exception
        : VendorInvoiceVarianceSeverity.Warning,
  };
}

export function buildRateVariance(input: {
  materialId: string | null;
  invoiceRate: number;
  poRate: number;
  tolerancePercent: number;
}): VarianceDraft | null {
  const variance = roundMoney(input.invoiceRate - input.poRate);
  if (Math.abs(variance) < 0.005) return null;

  const pct = percentVariance(input.invoiceRate, input.poRate);
  const withinTolerance = pct <= input.tolerancePercent + 1e-9;

  return {
    type: VendorInvoiceVarianceType.Rate,
    materialId:
      input.materialId && Types.ObjectId.isValid(input.materialId)
        ? new Types.ObjectId(input.materialId)
        : null,
    message: `Invoice rate ${input.invoiceRate} vs PO rate ${input.poRate} (${pct}% variance)`,
    expected: input.poRate,
    actual: input.invoiceRate,
    severity: withinTolerance
      ? VendorInvoiceVarianceSeverity.Warning
      : VendorInvoiceVarianceSeverity.Exception,
  };
}

export function summarizeMatchingStatus(
  variances: Array<{ severity: VendorInvoiceVarianceSeverity }>,
): 'matched' | 'matched_with_tolerance' | 'exception' {
  if (variances.length === 0) return 'matched';
  if (
    variances.some((v) => v.severity === VendorInvoiceVarianceSeverity.Exception)
  ) {
    return 'exception';
  }
  return 'matched_with_tolerance';
}

export function computeNetInvoicePayable(input: {
  totalAmount: number;
  tds?: number;
  retention?: number;
}): number {
  return roundMoney(
    Math.max(0, input.totalAmount - (input.tds ?? 0) - (input.retention ?? 0)),
  );
}

export function computeRemainingPayable(input: {
  totalAmount: number;
  tds?: number;
  retention?: number;
  paidAmount?: number;
}): number {
  return roundMoney(
    Math.max(
      0,
      computeNetInvoicePayable(input) - (input.paidAmount ?? 0),
    ),
  );
}
