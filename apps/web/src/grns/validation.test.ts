import { describe, expect, it } from 'vitest';
import {
  defaultAcceptDrafts,
  validateAcceptLine,
  validateAcceptPayload,
} from './validation';

describe('validateAcceptLine — accepted + rejected ≤ received', () => {
  it('allows full acceptance', () => {
    const result = validateAcceptLine({
      lineId: 'l1',
      receivedQuantity: 100,
      acceptedQuantity: 100,
      rejectedQuantity: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.exceedsReceived).toBe(false);
  });

  it('allows partial acceptance when sum equals received', () => {
    const result = validateAcceptLine({
      lineId: 'l1',
      receivedQuantity: 100,
      acceptedQuantity: 90,
      rejectedQuantity: 10,
      rejectionReason: 'Damaged bags',
    });
    expect(result.ok).toBe(true);
    expect(result.exceedsReceived).toBe(false);
    expect(result.underAllocated).toBe(false);
  });

  it('rejects when accepted + rejected exceeds received', () => {
    const result = validateAcceptLine({
      lineId: 'l1',
      receivedQuantity: 100,
      acceptedQuantity: 96,
      rejectedQuantity: 5,
    });
    expect(result.ok).toBe(false);
    expect(result.exceedsReceived).toBe(true);
    expect(result.messages.join(' ')).toMatch(/must not exceed received/);
  });

  it('flags under-allocation (Nest requires equality)', () => {
    const result = validateAcceptLine({
      lineId: 'l1',
      receivedQuantity: 100,
      acceptedQuantity: 90,
      rejectedQuantity: 5,
      rejectionReason: 'Damaged bags',
    });
    expect(result.ok).toBe(false);
    expect(result.underAllocated).toBe(true);
    expect(result.exceedsReceived).toBe(false);
  });

  it('requires rejection reason when rejected > 0', () => {
    const result = validateAcceptLine({
      lineId: 'l1',
      receivedQuantity: 100,
      acceptedQuantity: 90,
      rejectedQuantity: 10,
      rejectionReason: 'ab',
    });
    expect(result.ok).toBe(false);
    expect(result.messages.join(' ')).toMatch(/Rejection reason/);
  });
});

describe('validateAcceptPayload — partial acceptance', () => {
  it('accepts mixed accept/reject lines for Nest payload', () => {
    const result = validateAcceptPayload([
      {
        lineId: 'l1',
        receivedQuantity: 100,
        acceptedQuantity: 90,
        rejectedQuantity: 10,
        rejectionReason: 'Moisture damage',
      },
      {
        lineId: 'l2',
        receivedQuantity: 50,
        acceptedQuantity: 50,
        rejectedQuantity: 0,
      },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        lineId: 'l1',
        acceptedQuantity: 90,
        rejectedQuantity: 10,
        rejectionReason: 'Moisture damage',
      });
      expect(result.items[1]?.rejectionReason).toBeNull();
    }
  });

  it('rejects full reject (Nest allowFullReject: false)', () => {
    const result = validateAcceptPayload([
      {
        lineId: 'l1',
        receivedQuantity: 100,
        acceptedQuantity: 0,
        rejectedQuantity: 100,
        rejectionReason: 'Entire lot rejected',
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/accepted quantity > 0/);
    }
  });

  it('rejects over-allocation across lines', () => {
    const result = validateAcceptPayload([
      {
        lineId: 'l1',
        receivedQuantity: 40,
        acceptedQuantity: 30,
        rejectedQuantity: 15,
        rejectionReason: 'Short delivery scrap',
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.lineErrors.l1?.join(' ')).toMatch(/must not exceed/);
    }
  });
});

describe('defaultAcceptDrafts', () => {
  it('defaults to full accept when no QC decision yet', () => {
    const drafts = defaultAcceptDrafts([
      { id: 'a', receivedQuantity: 12 },
    ]);
    expect(drafts[0]).toMatchObject({
      lineId: 'a',
      acceptedQuantity: 12,
      rejectedQuantity: 0,
    });
  });
});
