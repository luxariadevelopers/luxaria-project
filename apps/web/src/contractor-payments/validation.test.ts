import { describe, expect, it } from 'vitest';
import { ContractorBillStatus } from '@luxaria/shared-types';
import type { PayableBillOption } from './types';
import {
  assertAllocationWithinPayable,
  assertAllocationsBalance,
  computeBankAmount,
  filterPayableBills,
} from './validation';

describe('contractor-payments validation — partial payment', () => {
  it('allows partial payment within remaining net payable', () => {
    expect(assertAllocationWithinPayable(500, 1000).ok).toBe(true);
    expect(
      assertAllocationsBalance({
        amount: 500,
        allocations: [{ amount: 500 }],
      }).ok,
    ).toBe(true);
  });

  it('rejects overpayment against remaining payable', () => {
    const result = assertAllocationWithinPayable(1200, 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/exceeds remaining payable/);
    }
  });

  it('requires allocation total to equal payment amount', () => {
    expect(
      assertAllocationsBalance({
        amount: 1000,
        allocations: [{ amount: 600 }, { amount: 400 }],
      }).ok,
    ).toBe(true);
    expect(
      assertAllocationsBalance({
        amount: 1000,
        allocations: [{ amount: 600 }],
      }).ok,
    ).toBe(false);
  });

  it('computes bank amount after retention / advance / TDS / penalty', () => {
    const ok = computeBankAmount({
      amount: 1000,
      tds: 100,
      retention: 50,
      advanceRecovery: 25,
      penalty: 25,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.bankAmount).toBe(800);
    expect(
      computeBankAmount({
        amount: 100,
        tds: 80,
        retention: 30,
        advanceRecovery: 0,
        penalty: 0,
      }).ok,
    ).toBe(false);
  });
});

describe('contractor-payments — payable bill gate (posted)', () => {
  const base: PayableBillOption = {
    id: 'b1',
    billNumber: 'RB-1',
    raNumber: 1,
    contractorId: 'c1',
    netPayable: 1000,
    paidAmount: 0,
    remainingPayable: 1000,
    status: ContractorBillStatus.Posted,
    retention: 50,
    advanceRecovery: 25,
    tds: 10,
  };

  it('includes posted bills with remaining payable', () => {
    expect(filterPayableBills([base])).toHaveLength(1);
  });

  it('excludes non-posted bills', () => {
    expect(
      filterPayableBills([
        {
          ...base,
          status: ContractorBillStatus.DirectorApproved,
        },
      ]),
    ).toHaveLength(0);
  });

  it('excludes zero remaining payable', () => {
    expect(
      filterPayableBills([{ ...base, remainingPayable: 0 }]),
    ).toHaveLength(0);
  });
});
