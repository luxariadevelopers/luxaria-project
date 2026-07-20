import { BadRequestException } from '@nestjs/common';
import type {
  Material,
  MaterialUnit,
} from '../material-master/schemas/material.schema';

export function assertPositiveQuantity(qty: number): void {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new BadRequestException('quantity must be a number > 0');
  }
}

export function assertNonNegativeAmount(
  value: number,
  field: string,
): void {
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

export function assertQuotationDates(
  quotationDate: Date,
  validityDate: Date,
): void {
  if (Number.isNaN(quotationDate.getTime())) {
    throw new BadRequestException('Invalid quotationDate');
  }
  if (Number.isNaN(validityDate.getTime())) {
    throw new BadRequestException('Invalid validityDate');
  }
  if (validityDate.getTime() < quotationDate.getTime()) {
    throw new BadRequestException(
      'validityDate cannot be earlier than quotationDate',
    );
  }
}

/** Line total = qty × rate − discount + tax */
export function computeLineTotal(input: {
  quantity: number;
  rate: number;
  tax: number;
  discount: number;
}): number {
  assertPositiveQuantity(input.quantity);
  assertNonNegativeAmount(input.rate, 'rate');
  assertNonNegativeAmount(input.tax, 'tax');
  assertNonNegativeAmount(input.discount, 'discount');

  const base = input.quantity * input.rate;
  if (input.discount - base > 1e-9) {
    throw new BadRequestException(
      'Line discount cannot exceed quantity × rate',
    );
  }
  return roundMoney(base - input.discount + input.tax);
}

export function computeGrandTotal(input: {
  itemsSubtotal: number;
  freight: number;
  taxes: number;
  discount: number;
}): number {
  assertNonNegativeAmount(input.itemsSubtotal, 'itemsSubtotal');
  assertNonNegativeAmount(input.freight, 'freight');
  assertNonNegativeAmount(input.taxes, 'taxes');
  assertNonNegativeAmount(input.discount, 'discount');

  const total =
    input.itemsSubtotal + input.freight + input.taxes - input.discount;
  if (total < -1e-9) {
    throw new BadRequestException(
      'Header discount cannot exceed items subtotal + freight + taxes',
    );
  }
  return roundMoney(Math.max(0, total));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
