import { BadRequestException } from '@nestjs/common';
import {
  computePeriodBillPayable,
  computeRunningBillPayable,
} from './contractor-bills.calculation';

describe('computeRunningBillPayable', () => {
  it('applies full CTR formula with paise rounding', () => {
    const result = computeRunningBillPayable({
      grossWorkValue: 250_000.126,
      approvedExtras: 10_000.014,
      priceEscalation: 5_000.004,
      previousCertifiedValue: 100_000.1,
      retention: 7_500.334,
      advanceRecovery: 20_000.114,
      materialRecovery: 3_000.224,
      equipmentRecovery: 1_500.334,
      labourRecovery: 800.444,
      penalties: 250.554,
      tds: 2_000.664,
      otherDeductions: 100.774,
      gst: 18_000.884,
    });

    // Components rounded independently first (banker's-safe fixtures)
    expect(result.grossWorkValue).toBe(250_000.13);
    expect(result.approvedExtras).toBe(10_000.01);
    expect(result.priceEscalation).toBe(5_000);
    expect(result.previousCertifiedValue).toBe(100_000.1);
    expect(result.retention).toBe(7_500.33);
    expect(result.advanceRecovery).toBe(20_000.11);
    expect(result.materialRecovery).toBe(3_000.22);
    expect(result.equipmentRecovery).toBe(1_500.33);
    expect(result.labourRecovery).toBe(800.44);
    expect(result.penalties).toBe(250.55);
    expect(result.tds).toBe(2_000.66);
    expect(result.otherDeductions).toBe(100.77);
    expect(result.gst).toBe(18_000.88);

    // currentGross = 250000.13 + 10000.01 + 5000 - 100000.1 = 165000.04
    expect(result.currentGrossValue).toBe(165_000.04);

    // recoveries = 20000.11 + 3000.22 + 1500.33 + 800.44 + 250.55 = 25551.65
    expect(result.totalRecoveries).toBe(25_551.65);

    // deductions = 7500.33 + 25551.65 + 2000.66 + 100.77 = 35153.41
    expect(result.totalDeductions).toBe(35_153.41);

    // net = 165000.04 - 35153.41 + 18000.88 = 147847.51
    expect(result.netPayable).toBe(147_847.51);
  });

  it('matches architecture example: gross − previous − recoveries + gst', () => {
    const result = computeRunningBillPayable({
      grossWorkValue: 100_000,
      approvedExtras: 5_000,
      priceEscalation: 2_000,
      previousCertifiedValue: 40_000,
      retention: 3_000,
      advanceRecovery: 10_000,
      materialRecovery: 1_000,
      equipmentRecovery: 500,
      labourRecovery: 250,
      penalties: 100,
      tds: 2_000,
      otherDeductions: 150,
      gst: 12_150,
    });

    // currentGross = 100000 + 5000 + 2000 - 40000 = 67000
    expect(result.currentGrossValue).toBe(67_000);
    // deductions = 3000 + 10000 + 1000 + 500 + 250 + 100 + 2000 + 150 = 17000
    expect(result.totalDeductions).toBe(17_000);
    // net = 67000 - 17000 + 12150 = 62150
    expect(result.netPayable).toBe(62_150);
  });

  it('rejects negative components and over-deduction', () => {
    expect(() =>
      computeRunningBillPayable({
        grossWorkValue: -1,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      computeRunningBillPayable({
        grossWorkValue: 1000,
        previousCertifiedValue: 1500,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      computeRunningBillPayable({
        grossWorkValue: 1000,
        retention: 2000,
      }),
    ).toThrow(BadRequestException);
  });

  it('period helper treats current certified as gross with previous = 0', () => {
    const result = computePeriodBillPayable({
      currentCertifiedValue: 100_000,
      approvedExtras: 0,
      priceEscalation: 0,
      retention: 5_000,
      advanceRecovery: 20_000,
      materialRecovery: 5_000,
      equipmentRecovery: 0,
      labourRecovery: 0,
      penalty: 1_000,
      tds: 2_000,
      otherDeductions: 500,
      gst: 0,
    });

    expect(result.previousCertifiedValue).toBe(0);
    expect(result.currentGrossValue).toBe(100_000);
    expect(result.totalDeductions).toBe(33_500);
    expect(result.netPayable).toBe(66_500);
  });

  it('rounds half-up style via Math.round for .005 boundaries', () => {
    // 10.005 → 10.01 ; 10.004 → 10.00
    expect(
      computeRunningBillPayable({
        grossWorkValue: 10.005,
        gst: 0,
      }).grossWorkValue,
    ).toBe(10.01);

    expect(
      computeRunningBillPayable({
        grossWorkValue: 10.004,
        gst: 0,
      }).grossWorkValue,
    ).toBe(10);
  });
});
