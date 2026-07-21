import { BadRequestException } from '@nestjs/common';

/** Money to 2 decimal places (paise). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type UnitQuotationPricingInput = {
  basePrice?: number;
  plc?: number;
  floorRise?: number;
  carPark?: number;
  clubHouse?: number;
  corpusFund?: number;
  registrationEstimate?: number;
  gst?: number;
  stampDutyEstimate?: number;
  discount?: number;
  offerAmount?: number;
  otherCharges?: number;
};

export type UnitQuotationTotals = {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
};

function assertNonNegativeMoney(value: number, field: string): number {
  const rounded = roundMoney(value);
  if (!Number.isFinite(rounded) || rounded < 0) {
    throw new BadRequestException(`${field} must be ≥ 0`);
  }
  return rounded;
}

function readPricingField(
  pricing: UnitQuotationPricingInput,
  field: keyof UnitQuotationPricingInput,
): number {
  return assertNonNegativeMoney(pricing[field] ?? 0, field);
}

/**
 * Sales unit quotation totals.
 *
 * grandTotal =
 *   basePrice + plc + floorRise + carPark + clubHouse + corpusFund
 *   + registrationEstimate + gst + stampDutyEstimate + otherCharges
 *   − discount − offerAmount
 *
 * subtotal = charge components − discount − offerAmount
 * taxTotal = registrationEstimate + gst + stampDutyEstimate
 */
export function computeUnitQuotationTotals(
  pricing: UnitQuotationPricingInput,
): UnitQuotationTotals {
  const basePrice = readPricingField(pricing, 'basePrice');
  const plc = readPricingField(pricing, 'plc');
  const floorRise = readPricingField(pricing, 'floorRise');
  const carPark = readPricingField(pricing, 'carPark');
  const clubHouse = readPricingField(pricing, 'clubHouse');
  const corpusFund = readPricingField(pricing, 'corpusFund');
  const registrationEstimate = readPricingField(pricing, 'registrationEstimate');
  const gst = readPricingField(pricing, 'gst');
  const stampDutyEstimate = readPricingField(pricing, 'stampDutyEstimate');
  const discount = readPricingField(pricing, 'discount');
  const offerAmount = readPricingField(pricing, 'offerAmount');
  const otherCharges = readPricingField(pricing, 'otherCharges');

  const chargeSubtotal = roundMoney(
    basePrice +
      plc +
      floorRise +
      carPark +
      clubHouse +
      corpusFund +
      otherCharges,
  );

  if (discount + offerAmount > chargeSubtotal + 1e-9) {
    throw new BadRequestException(
      'discount + offerAmount cannot exceed charge subtotal',
    );
  }

  const taxTotal = roundMoney(
    registrationEstimate + gst + stampDutyEstimate,
  );
  const subtotal = roundMoney(chargeSubtotal - discount - offerAmount);
  const grandTotal = roundMoney(subtotal + taxTotal);

  return { subtotal, taxTotal, grandTotal };
}
