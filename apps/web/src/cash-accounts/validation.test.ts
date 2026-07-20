import { describe, expect, it } from 'vitest';
import { CashAccountKind } from './types';
import {
  assertDifferentCustodian,
  cashAccountCreateSchema,
  custodianTransferSchema,
} from './validation';

const oid = '507f1f77bcf86cd799439011';
const oid2 = '507f1f77bcf86cd799439022';

describe('cashAccountCreateSchema', () => {
  it('requires custodian and ledger ObjectIds', () => {
    const parsed = cashAccountCreateSchema.safeParse({
      accountName: 'Site float',
      kind: CashAccountKind.PettyCash,
      projectId: oid,
      custodianUserId: '',
      ledgerAccountId: oid2,
      maximumHoldingLimit: 50000,
      replenishmentLevel: 10000,
      openingBalance: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects replenishment above holding limit', () => {
    const parsed = cashAccountCreateSchema.safeParse({
      accountName: 'Site float',
      kind: CashAccountKind.SiteCash,
      projectId: oid,
      custodianUserId: oid,
      ledgerAccountId: oid2,
      maximumHoldingLimit: 10000,
      replenishmentLevel: 20000,
      openingBalance: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid create payload with one custodian', () => {
    const parsed = cashAccountCreateSchema.safeParse({
      accountName: 'Tower A petty cash',
      kind: CashAccountKind.PettyCash,
      projectId: oid,
      custodianUserId: oid,
      ledgerAccountId: oid2,
      maximumHoldingLimit: 50000,
      replenishmentLevel: 10000,
      openingBalance: 5000,
    });
    expect(parsed.success).toBe(true);
  });
});

describe('assertDifferentCustodian', () => {
  it('rejects same user as current custodian', () => {
    const result = assertDifferentCustodian(oid, oid);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/different from the current custodian/);
    }
  });

  it('allows a different incoming custodian', () => {
    expect(assertDifferentCustodian(oid, oid2).ok).toBe(true);
  });
});

describe('custodianTransferSchema', () => {
  it('requires incoming custodian ObjectId', () => {
    const parsed = custodianTransferSchema.safeParse({
      toUserId: 'not-an-id',
      notes: 'Handover',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts transfer with optional declared balance string', () => {
    const parsed = custodianTransferSchema.safeParse({
      toUserId: oid2,
      declaredBalance: '1500',
      notes: 'Shift change',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.declaredBalance).toBe('1500');
    }
  });

  it('allows empty declared balance string', () => {
    const parsed = custodianTransferSchema.safeParse({
      toUserId: oid2,
      declaredBalance: '',
    });
    expect(parsed.success).toBe(true);
  });
});
