import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  VendorInvoiceMatchingStatus,
  VendorInvoiceVarianceSeverity,
  VendorInvoiceVarianceType,
} from './schemas/vendor-invoice.schema';
import {
  percentVariance,
  roundMoney,
  roundQty,
  type VarianceDraft,
} from './vendor-invoices.validation';

export type ThreeWayTolerances = {
  quantityPercent: number;
  ratePercent: number;
  taxPercent: number;
  freightPercent: number;
  discountPercent: number;
  totalPercent: number;
};

export type ThreeWayPoLine = {
  id: string;
  materialId: string;
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
  total: number;
};

export type ThreeWayPoHeader = {
  taxes: number;
  freight: number;
  discount: number;
  total: number;
  items: ThreeWayPoLine[];
};

export type ThreeWayInvoiceLine = {
  materialId: string;
  materialCode: string | null;
  purchaseOrderLineId: string | null;
  quantity: number;
  rate: number;
  tax: number;
  amount: number;
};

export type ThreeWayInvoiceHeader = {
  gst: number;
  freight: number;
  discount: number;
  totalAmount: number;
  items: ThreeWayInvoiceLine[];
};

/**
 * Build a explained mismatch when actual ≠ expected beyond absolute epsilon,
 * using % tolerance for warning vs exception.
 */
export function buildFieldVariance(input: {
  type: VendorInvoiceVarianceType;
  materialId?: string | null;
  fieldLabel: string;
  expected: number;
  actual: number;
  tolerancePercent: number;
  /** Absolute money epsilon (default 0.005) or qty epsilon. */
  absoluteEpsilon?: number;
  /** When true, only over-actual beyond tolerance is Exception; under is Warning. */
  exceptionOnlyWhenOver?: boolean;
}): VarianceDraft | null {
  const epsilon = input.absoluteEpsilon ?? 0.005;
  const delta = input.actual - input.expected;
  if (Math.abs(delta) <= epsilon) return null;

  const pct = percentVariance(input.actual, input.expected);
  const withinTolerance = pct <= input.tolerancePercent + 1e-9;
  const over = delta > 0;

  let severity: VendorInvoiceVarianceSeverity;
  if (withinTolerance) {
    severity = VendorInvoiceVarianceSeverity.Warning;
  } else if (input.exceptionOnlyWhenOver && !over) {
    severity = VendorInvoiceVarianceSeverity.Warning;
  } else {
    severity = VendorInvoiceVarianceSeverity.Exception;
  }

  return {
    type: input.type,
    materialId:
      input.materialId && Types.ObjectId.isValid(input.materialId)
        ? new Types.ObjectId(input.materialId)
        : null,
    message: `${input.fieldLabel}: invoice ${input.actual} vs expected ${input.expected} (${pct}% variance)`,
    expected: input.expected,
    actual: input.actual,
    severity,
  };
}

export function summarizeThreeWayStatus(
  variances: Array<{ severity: VendorInvoiceVarianceSeverity }>,
): VendorInvoiceMatchingStatus {
  if (variances.length === 0) return VendorInvoiceMatchingStatus.Matched;
  if (
    variances.some((v) => v.severity === VendorInvoiceVarianceSeverity.Exception)
  ) {
    return VendorInvoiceMatchingStatus.Exception;
  }
  return VendorInvoiceMatchingStatus.MatchedWithTolerance;
}

export type ThreeWayLineResult = {
  materialId: string;
  purchaseOrderLineId: string | null;
  poRate: number | null;
  poOrderedQuantity: number | null;
  poLineTax: number | null;
  grnAcceptedQuantity: number;
  quantityVariance: number | null;
  rateVariance: number | null;
  taxVariance: number | null;
};

export type ThreeWayMatchResult = {
  variances: VarianceDraft[];
  matchingStatus: VendorInvoiceMatchingStatus;
  lineResults: ThreeWayLineResult[];
};

/**
 * Full three-way compare: PO ↔ GRN accepted qty ↔ Vendor Invoice
 * (material, quantity, rate, tax, freight, discount, total).
 */
export function runThreeWayMatch(input: {
  po: ThreeWayPoHeader;
  invoice: ThreeWayInvoiceHeader;
  /** Remaining GRN accepted qty by `line:{poLineId}` or `mat:{materialId}`. */
  remainingGrnAcceptedByKey: Map<string, number>;
  tolerances: ThreeWayTolerances;
}): ThreeWayMatchResult {
  const variances: VarianceDraft[] = [];
  const lineResults: ThreeWayLineResult[] = [];
  const poLinesById = new Map(input.po.items.map((l) => [l.id, l]));
  const poMaterials = new Set(input.po.items.map((l) => l.materialId));

  for (const item of input.invoice.items) {
    const lineKey = item.purchaseOrderLineId
      ? `line:${item.purchaseOrderLineId}`
      : `mat:${item.materialId}`;

    let poLine = item.purchaseOrderLineId
      ? poLinesById.get(item.purchaseOrderLineId)
      : undefined;
    if (!poLine) {
      poLine = input.po.items.find((l) => l.materialId === item.materialId);
    }

    if (!poLine || !poMaterials.has(item.materialId)) {
      variances.push({
        type: VendorInvoiceVarianceType.Material,
        materialId: Types.ObjectId.isValid(item.materialId)
          ? new Types.ObjectId(item.materialId)
          : null,
        message: `Material ${item.materialCode ?? item.materialId} is not on the purchase order`,
        expected: null,
        actual: null,
        severity: VendorInvoiceVarianceSeverity.Exception,
      });
      lineResults.push({
        materialId: item.materialId,
        purchaseOrderLineId: item.purchaseOrderLineId,
        poRate: null,
        poOrderedQuantity: null,
        poLineTax: null,
        grnAcceptedQuantity: 0,
        quantityVariance: item.quantity,
        rateVariance: item.rate,
        taxVariance: item.tax,
      });
      continue;
    }

    const remainingAccepted =
      input.remainingGrnAcceptedByKey.get(lineKey) ??
      input.remainingGrnAcceptedByKey.get(`mat:${item.materialId}`) ??
      0;

    const qtyVar = buildFieldVariance({
      type: VendorInvoiceVarianceType.Quantity,
      materialId: item.materialId,
      fieldLabel: `Quantity (GRN accepted remaining) for ${item.materialCode ?? item.materialId}`,
      expected: remainingAccepted,
      actual: item.quantity,
      tolerancePercent: input.tolerances.quantityPercent,
      absoluteEpsilon: 1e-9,
      exceptionOnlyWhenOver: true,
    });
    if (qtyVar) variances.push(qtyVar);

    const rateVar = buildFieldVariance({
      type: VendorInvoiceVarianceType.Rate,
      materialId: item.materialId,
      fieldLabel: `Rate (PO) for ${item.materialCode ?? item.materialId}`,
      expected: poLine.rate,
      actual: item.rate,
      tolerancePercent: input.tolerances.ratePercent,
    });
    if (rateVar) variances.push(rateVar);

    // Expected line tax: PO line tax × (invoice qty / PO qty)
    const expectedLineTax =
      poLine.quantity > 1e-9
        ? roundMoney(poLine.tax * (item.quantity / poLine.quantity))
        : 0;
    const taxVar = buildFieldVariance({
      type: VendorInvoiceVarianceType.Tax,
      materialId: item.materialId,
      fieldLabel: `Line tax (PO pro-rata) for ${item.materialCode ?? item.materialId}`,
      expected: expectedLineTax,
      actual: item.tax,
      tolerancePercent: input.tolerances.taxPercent,
    });
    if (taxVar) variances.push(taxVar);

    lineResults.push({
      materialId: item.materialId,
      purchaseOrderLineId: poLine.id,
      poRate: poLine.rate,
      poOrderedQuantity: poLine.quantity,
      poLineTax: expectedLineTax,
      grnAcceptedQuantity: remainingAccepted,
      quantityVariance: roundQty(item.quantity - remainingAccepted),
      rateVariance: roundMoney(item.rate - poLine.rate),
      taxVariance: roundMoney(item.tax - expectedLineTax),
    });
  }

  // Pro-rata PO header values for this invoice share (supports partial invoices).
  const poBase = input.po.items.reduce(
    (sum, l) => sum + l.quantity * l.rate,
    0,
  );
  const invoiceBase = input.invoice.items.reduce((sum, item) => {
    const poLine =
      (item.purchaseOrderLineId
        ? poLinesById.get(item.purchaseOrderLineId)
        : undefined) ??
      input.po.items.find((l) => l.materialId === item.materialId);
    const rate = poLine?.rate ?? item.rate;
    return sum + item.quantity * rate;
  }, 0);
  const share = poBase > 1e-9 ? invoiceBase / poBase : 0;

  const expectedTax = roundMoney(input.po.taxes * share);
  const expectedFreight = roundMoney(input.po.freight * share);
  const expectedDiscount = roundMoney(input.po.discount * share);
  const expectedTotal = roundMoney(input.po.total * share);

  const headerTax = buildFieldVariance({
    type: VendorInvoiceVarianceType.Tax,
    fieldLabel: 'Header tax/GST (PO taxes, pro-rata)',
    expected: expectedTax,
    actual: roundMoney(input.invoice.gst),
    tolerancePercent: input.tolerances.taxPercent,
  });
  if (headerTax) variances.push(headerTax);

  const freightVar = buildFieldVariance({
    type: VendorInvoiceVarianceType.Freight,
    fieldLabel: 'Freight (PO, pro-rata)',
    expected: expectedFreight,
    actual: roundMoney(input.invoice.freight),
    tolerancePercent: input.tolerances.freightPercent,
  });
  if (freightVar) variances.push(freightVar);

  const discountVar = buildFieldVariance({
    type: VendorInvoiceVarianceType.Discount,
    fieldLabel: 'Discount (PO, pro-rata)',
    expected: expectedDiscount,
    actual: roundMoney(input.invoice.discount),
    tolerancePercent: input.tolerances.discountPercent,
  });
  if (discountVar) variances.push(discountVar);

  const totalVar = buildFieldVariance({
    type: VendorInvoiceVarianceType.Total,
    fieldLabel: 'Total (PO, pro-rata)',
    expected: expectedTotal,
    actual: roundMoney(input.invoice.totalAmount),
    tolerancePercent: input.tolerances.totalPercent,
  });
  if (totalVar) variances.push(totalVar);

  return {
    variances,
    matchingStatus: summarizeThreeWayStatus(variances),
    lineResults,
  };
}

/**
 * Payment is allowed only when fully matched, matched within tolerance,
 * or exception was explicitly approved. Rejected / pending / unapproved exception block payment.
 */
export function assertInvoicePaymentAllowed(input: {
  status: string;
  matchingStatus: VendorInvoiceMatchingStatus;
  exceptionApproved: boolean;
}): void {
  if (input.status !== 'posted') {
    throw new BadRequestException(
      'Only posted invoices can be paid',
    );
  }

  if (input.matchingStatus === VendorInvoiceMatchingStatus.Rejected) {
    throw new BadRequestException(
      'Payment blocked: three-way matching was rejected',
    );
  }

  if (input.matchingStatus === VendorInvoiceMatchingStatus.Pending) {
    throw new BadRequestException(
      'Payment blocked: three-way matching has not been completed',
    );
  }

  if (input.matchingStatus === VendorInvoiceMatchingStatus.Exception) {
    if (!input.exceptionApproved) {
      throw new BadRequestException(
        'Payment blocked: matching exceptions require approval before payment',
      );
    }
    return;
  }

  if (
    input.matchingStatus !== VendorInvoiceMatchingStatus.Matched &&
    input.matchingStatus !== VendorInvoiceMatchingStatus.MatchedWithTolerance
  ) {
    throw new BadRequestException(
      'Payment blocked: invoice must be matched (or exception-approved) before payment',
    );
  }
}
