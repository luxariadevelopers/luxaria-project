/** Money rounding aligned with Nest `roundMoney`. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/** Nest `computeLineAmount` — qty × rate + tax. */
export function computeLineAmount(input: {
  quantity: number;
  rate: number;
  tax?: number;
}): number {
  return roundMoney(input.quantity * input.rate + (input.tax ?? 0));
}

/**
 * Nest `assertHeaderTotals` expected gross:
 * taxableValue + gst + freight === totalAmount (discount is not subtracted here).
 */
export function computeExpectedTotalAmount(input: {
  taxableValue: number;
  gst: number;
  freight: number;
}): number {
  return roundMoney(input.taxableValue + input.gst + input.freight);
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

/** Sum of line amounts for taxable preview (client assist). */
export function sumLineAmounts(
  items: ReadonlyArray<{ quantity: number; rate: number; tax?: number }>,
): number {
  return roundMoney(
    items.reduce((sum, item) => sum + computeLineAmount(item), 0),
  );
}
