import { BadRequestException } from '@nestjs/common';
import {
  assertPeriodRange,
  resolveMbQuantity,
  roundQty,
} from './measurement-book.validation';

describe('measurement-book.validation', () => {
  describe('resolveMbQuantity', () => {
    it('computes L×B×H×nos', () => {
      const qty = resolveMbQuantity({
        length: 2,
        breadth: 3,
        height: 0.5,
        numberOfUnits: 4,
      });
      expect(qty.calculatedQuantity).toBe(12);
      expect(qty.quantity).toBe(12);
    });

    it('treats missing dims as 1 when any dim present', () => {
      const qty = resolveMbQuantity({ length: 10, numberOfUnits: 2 });
      expect(qty.quantity).toBe(20);
    });

    it('prefers formulaQuantity over calculated', () => {
      const qty = resolveMbQuantity({
        length: 2,
        breadth: 2,
        height: 2,
        numberOfUnits: 1,
        formulaQuantity: 5.5,
      });
      expect(qty.calculatedQuantity).toBe(8);
      expect(qty.quantity).toBe(5.5);
    });

    it('uses nos-only when no dims', () => {
      const qty = resolveMbQuantity({ numberOfUnits: 7 });
      expect(qty.quantity).toBe(7);
    });

    it('rejects negative dimensions', () => {
      expect(() =>
        resolveMbQuantity({ length: -1, numberOfUnits: 1 }),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertPeriodRange', () => {
    it('rejects inverted period', () => {
      expect(() =>
        assertPeriodRange(new Date('2026-07-15'), new Date('2026-07-01')),
      ).toThrow(BadRequestException);
    });
  });

  it('roundQty keeps micro precision', () => {
    expect(roundQty(1.23456789)).toBe(1.234568);
  });
});
