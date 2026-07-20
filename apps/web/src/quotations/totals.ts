import { roundMoney } from '@/validation';

/**
 * Nest `computeLineTotal`: quantity × rate − discount + tax (₹, 2 dp).
 */
export function computeLineTotal(input: {
  quantity: number;
  rate: number;
  tax?: number;
  discount?: number;
}): number {
  const quantity = Number(input.quantity);
  const rate = Number(input.rate);
  const tax = Number(input.tax ?? 0);
  const discount = Number(input.discount ?? 0);
  const base = quantity * rate;
  return roundMoney(base - discount + tax);
}

/**
 * Nest `computeGrandTotal`:
 * itemsSubtotal + freight + taxes − discount (₹, 2 dp).
 */
export function computeGrandTotal(input: {
  itemsSubtotal: number;
  freight?: number;
  taxes?: number;
  discount?: number;
}): number {
  const itemsSubtotal = Number(input.itemsSubtotal);
  const freight = Number(input.freight ?? 0);
  const taxes = Number(input.taxes ?? 0);
  const discount = Number(input.discount ?? 0);
  return roundMoney(Math.max(0, itemsSubtotal + freight + taxes - discount));
}

export function sumItemsSubtotal(
  items: ReadonlyArray<{ total: number }>,
): number {
  const sum = items.reduce((acc, item) => {
    const total = Number(item.total);
    return acc + (Number.isFinite(total) ? total : 0);
  }, 0);
  return roundMoney(sum);
}

/** Preview header + line totals for the entry form. */
export function previewQuotationTotals(input: {
  items: ReadonlyArray<{
    quantity: number;
    rate: number;
    tax?: number;
    discount?: number;
  }>;
  freight?: number;
  taxes?: number;
  discount?: number;
}): {
  lines: Array<{ total: number }>;
  itemsSubtotal: number;
  grandTotal: number;
} {
  const lines = input.items.map((item) => ({
    total: computeLineTotal(item),
  }));
  const itemsSubtotal = sumItemsSubtotal(lines);
  const grandTotal = computeGrandTotal({
    itemsSubtotal,
    freight: input.freight,
    taxes: input.taxes,
    discount: input.discount,
  });
  return { lines, itemsSubtotal, grandTotal };
}
