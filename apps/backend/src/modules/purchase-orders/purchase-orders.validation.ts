import { BadRequestException } from '@nestjs/common';
import type {
  Material,
  MaterialUnit,
} from '../material-master/schemas/material.schema';

export const DEFAULT_RECEIVE_TOLERANCE_PERCENT = 5;

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function assertPositiveQuantity(qty: number, field = 'quantity'): void {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new BadRequestException(`${field} must be a number > 0`);
  }
}

export function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${field} must be a number ≥ 0`);
  }
}

export function assertMaterialUnitAllowed(
  unit: MaterialUnit,
  material: Pick<Material, 'baseUnit' | 'alternateUnits'>,
): void {
  const allowed = new Set<MaterialUnit>([
    material.baseUnit,
    ...(material.alternateUnits ?? []),
  ]);
  if (!allowed.has(unit)) {
    throw new BadRequestException(
      `Unit ${unit} is not allowed for material (base=${material.baseUnit})`,
    );
  }
}

export function assertOrderDates(
  orderDate: Date,
  expectedDeliveryDate: Date,
): void {
  if (Number.isNaN(orderDate.getTime())) {
    throw new BadRequestException('Invalid orderDate');
  }
  if (Number.isNaN(expectedDeliveryDate.getTime())) {
    throw new BadRequestException('Invalid expectedDeliveryDate');
  }
  if (expectedDeliveryDate.getTime() < orderDate.getTime()) {
    throw new BadRequestException(
      'expectedDeliveryDate cannot be earlier than orderDate',
    );
  }
}

export function computeLineTotal(input: {
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
}): number {
  assertPositiveQuantity(input.quantity);
  assertNonNegative(input.rate, 'rate');
  assertNonNegative(input.tax, 'tax');
  assertNonNegative(input.discount, 'discount');
  const base = input.quantity * input.rate;
  if (input.discount - base > 1e-9) {
    throw new BadRequestException(
      'Line discount cannot exceed quantity × rate',
    );
  }
  return roundMoney(base - input.discount + input.tax);
}

export function computePoTotal(input: {
  subtotal: number;
  taxes: number;
  freight: number;
  discount: number;
}): number {
  assertNonNegative(input.subtotal, 'subtotal');
  assertNonNegative(input.taxes, 'taxes');
  assertNonNegative(input.freight, 'freight');
  assertNonNegative(input.discount, 'discount');
  const total =
    input.subtotal + input.taxes + input.freight - input.discount;
  if (total < -1e-9) {
    throw new BadRequestException(
      'Header discount cannot exceed subtotal + taxes + freight',
    );
  }
  return roundMoney(Math.max(0, total));
}

/**
 * Max receivable cumulative qty = ordered × (1 + tolerancePercent/100).
 */
export function maxReceivableQuantity(
  orderedQuantity: number,
  tolerancePercent: number,
): number {
  assertNonNegative(orderedQuantity, 'orderedQuantity');
  if (!Number.isFinite(tolerancePercent) || tolerancePercent < 0) {
    throw new BadRequestException('tolerancePercent must be ≥ 0');
  }
  return orderedQuantity * (1 + tolerancePercent / 100);
}

/**
 * Validates a receipt increment against PO qty and configured over-delivery tolerance.
 */
export function assertReceivableQuantity(input: {
  orderedQuantity: number;
  alreadyReceived: number;
  receiveNow: number;
  tolerancePercent: number;
  materialLabel?: string;
}): void {
  assertPositiveQuantity(input.receiveNow, 'receivedQuantity');
  assertNonNegative(input.alreadyReceived, 'alreadyReceived');

  const nextTotal = input.alreadyReceived + input.receiveNow;
  const maxQty = maxReceivableQuantity(
    input.orderedQuantity,
    input.tolerancePercent,
  );

  if (nextTotal - maxQty > 1e-9) {
    const label = input.materialLabel ? ` for ${input.materialLabel}` : '';
    throw new BadRequestException(
      `Received quantity${label} (${roundMoney(nextTotal)}) exceeds PO quantity (${input.orderedQuantity}) beyond ${input.tolerancePercent}% tolerance (max ${roundMoney(maxQty)})`,
    );
  }
}

export function computeBalanceQuantity(
  orderedQuantity: number,
  receivedQuantity: number,
): number {
  return roundMoney(orderedQuantity - receivedQuantity);
}

export function estimateBalanceAmount(
  items: Array<{
    quantity: number;
    receivedQuantity: number;
    rate: number;
    tax: number;
    discount: number;
    total: number;
  }>,
): number {
  let balance = 0;
  for (const item of items) {
    if (item.quantity <= 0) continue;
    const openRatio = Math.max(
      0,
      (item.quantity - item.receivedQuantity) / item.quantity,
    );
    balance += item.total * openRatio;
  }
  return roundMoney(balance);
}
