import {
  amountsReconcile,
  computeGrossAmount,
  computeNetAmount,
  deriveLabourAmounts,
  MONEY_EPS,
  roundMoney,
} from '../calculations';

describe('labour voucher calculations', () => {
  it('computes gross as quantity × rate', () => {
    expect(computeGrossAmount(8, 750)).toBe(6000);
    expect(computeGrossAmount(1.5, 1000)).toBe(1500);
  });

  it('computes net as gross − deductions with money rounding', () => {
    expect(computeNetAmount(6000, 200)).toBe(5800);
    expect(computeNetAmount(100.125, 0.12)).toBe(roundMoney(100.005));
  });

  it('reconciles net with Nest-style epsilon', () => {
    const gross = 5000;
    const deductions = 125.5;
    const net = computeNetAmount(gross, deductions);
    expect(amountsReconcile(gross, deductions, net)).toBe(true);
    expect(amountsReconcile(gross, deductions, net + MONEY_EPS + 0.01)).toBe(
      false,
    );
  });

  it('derives amounts from attendance quantity, rate, and deductions', () => {
    const result = deriveLabourAmounts({
      attendanceQuantity: '2',
      rate: '1500',
      deductions: '100',
    });
    expect(result).toEqual({
      quantity: 2,
      rate: 1500,
      grossAmount: 3000,
      deductions: 100,
      netAmount: 2900,
    });
  });

  it('rejects zero quantity/rate and over-deduction', () => {
    expect(
      deriveLabourAmounts({
        attendanceQuantity: '0',
        rate: '100',
        deductions: '0',
      }),
    ).toMatchObject({ error: expect.stringMatching(/quantity/i) });

    expect(
      deriveLabourAmounts({
        attendanceQuantity: '1',
        rate: '0',
        deductions: '0',
      }),
    ).toMatchObject({ error: expect.stringMatching(/rate/i) });

    expect(
      deriveLabourAmounts({
        attendanceQuantity: '1',
        rate: '100',
        deductions: '150',
      }),
    ).toMatchObject({ error: expect.stringMatching(/exceed/i) });
  });

  it('requires net > 0 after deductions', () => {
    expect(
      deriveLabourAmounts({
        attendanceQuantity: '1',
        rate: '100',
        deductions: '100',
      }),
    ).toMatchObject({ error: expect.stringMatching(/net amount/i) });
  });
});
