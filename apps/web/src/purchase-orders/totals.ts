import { roundMoney } from '@/validation';

/**
 * Mirrors Nest `computeLineTotal` /
 * `apps/backend/.../purchase-orders.validation.ts`.
 * `total = quantity × rate − discount + tax` (2 dp).
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
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (!Number.isFinite(rate) || rate < 0) return 0;
  const safeTax = Number.isFinite(tax) && tax >= 0 ? tax : 0;
  const safeDiscount =
    Number.isFinite(discount) && discount >= 0 ? discount : 0;
  const base = quantity * rate;
  return roundMoney(base - safeDiscount + safeTax);
}

/**
 * Mirrors Nest `computePoTotal`.
 * `total = subtotal + taxes + freight − discount` (floored at 0, 2 dp).
 */
export function computePoTotal(input: {
  subtotal: number;
  taxes?: number;
  freight?: number;
  discount?: number;
}): number {
  const subtotal = Number(input.subtotal);
  const taxes = Number(input.taxes ?? 0);
  const freight = Number(input.freight ?? 0);
  const discount = Number(input.discount ?? 0);
  const safeSub =
    Number.isFinite(subtotal) && subtotal >= 0 ? subtotal : 0;
  const safeTax = Number.isFinite(taxes) && taxes >= 0 ? taxes : 0;
  const safeFreight =
    Number.isFinite(freight) && freight >= 0 ? freight : 0;
  const safeDiscount =
    Number.isFinite(discount) && discount >= 0 ? discount : 0;
  return roundMoney(
    Math.max(0, safeSub + safeTax + safeFreight - safeDiscount),
  );
}

export type PoTotalsPreview = {
  lineTotals: number[];
  subtotal: number;
  taxes: number;
  freight: number;
  discount: number;
  total: number;
};

/** Client preview of header + line totals (Nest remains authoritative). */
export function previewPoTotals(input: {
  items: ReadonlyArray<{
    quantity: number;
    rate: number;
    tax?: number;
    discount?: number;
  }>;
  taxes?: number;
  freight?: number;
  discount?: number;
}): PoTotalsPreview {
  const lineTotals = input.items.map((item) => computeLineTotal(item));
  const subtotal = roundMoney(
    lineTotals.reduce((sum, value) => sum + value, 0),
  );
  const taxes = Number(input.taxes ?? 0);
  const freight = Number(input.freight ?? 0);
  const discount = Number(input.discount ?? 0);
  return {
    lineTotals,
    subtotal,
    taxes: Number.isFinite(taxes) && taxes >= 0 ? taxes : 0,
    freight: Number.isFinite(freight) && freight >= 0 ? freight : 0,
    discount: Number.isFinite(discount) && discount >= 0 ? discount : 0,
    total: computePoTotal({
      subtotal,
      taxes,
      freight,
      discount,
    }),
  };
}
