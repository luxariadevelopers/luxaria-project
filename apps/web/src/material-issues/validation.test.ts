import { describe, expect, it } from 'vitest';
import { MaterialUnit } from './types';
import {
  assertIssueWithinAvailableStock,
  assertPositiveReturnQuantity,
  issueCreateSchema,
  materialReturnSchema,
} from './validation';

describe('assertIssueWithinAvailableStock', () => {
  it('blocks issue above available stock (negative-stock prevention)', () => {
    const result = assertIssueWithinAvailableStock({
      materialLabel: 'CEM-001',
      requestedBaseQuantity: 120,
      availableBaseQuantity: 100,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Insufficient stock');
      expect(result.message).toContain('available 100');
      expect(result.message).toContain('requested 120');
    }
  });

  it('allows issue equal to available stock', () => {
    expect(
      assertIssueWithinAvailableStock({
        materialLabel: 'CEM-001',
        requestedBaseQuantity: 100,
        availableBaseQuantity: 100,
      }).ok,
    ).toBe(true);
  });

  it('rejects non-positive requested quantity', () => {
    const result = assertIssueWithinAvailableStock({
      materialLabel: 'CEM-001',
      requestedBaseQuantity: 0,
      availableBaseQuantity: 50,
    });
    expect(result.ok).toBe(false);
  });
});

describe('assertPositiveReturnQuantity', () => {
  it('requires positive return quantity', () => {
    const result = assertPositiveReturnQuantity({
      materialLabel: 'CEM-001',
      returnQuantity: 0,
      remainingBaseQuantity: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('greater than 0');
    }
  });

  it('blocks return above remaining issued quantity', () => {
    const result = assertPositiveReturnQuantity({
      materialLabel: 'CEM-001',
      returnQuantity: 12,
      remainingBaseQuantity: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('exceeds remaining');
    }
  });

  it('allows positive return within remaining', () => {
    expect(
      assertPositiveReturnQuantity({
        materialLabel: 'CEM-001',
        returnQuantity: 5,
        remainingBaseQuantity: 10,
      }).ok,
    ).toBe(true);
  });
});

describe('issueCreateSchema stock refine', () => {
  const base = {
    projectId: '507f1f77bcf86cd799439011',
    issueDate: '2026-07-20',
    receivedBy: '507f1f77bcf86cd799439012',
    boqItemId: '507f1f77bcf86cd799439013',
    workLocation: 'Block A – Column casting',
    items: [
      {
        materialId: '507f1f77bcf86cd799439014',
        quantity: 50,
        unit: MaterialUnit.Bag,
        availableBaseQuantity: 40,
        materialLabel: 'CEM-001',
      },
    ],
  };

  it('fails create when quantity exceeds available stock', () => {
    const parsed = issueCreateSchema.safeParse(base);
    expect(parsed.success).toBe(false);
  });

  it('passes when quantity is within available stock', () => {
    const parsed = issueCreateSchema.safeParse({
      ...base,
      items: [
        {
          ...base.items[0]!,
          quantity: 30,
          availableBaseQuantity: 40,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('materialReturnSchema', () => {
  it('rejects non-positive return lines', () => {
    const parsed = materialReturnSchema.safeParse({
      returnDate: '2026-07-21',
      items: [
        {
          materialId: '507f1f77bcf86cd799439014',
          quantity: 0,
          unit: MaterialUnit.Bag,
          remainingBaseQuantity: 10,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
