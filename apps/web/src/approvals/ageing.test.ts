import { describe, expect, it } from 'vitest';
import { computeApprovalAgeing } from './ageing';

describe('computeApprovalAgeing', () => {
  const now = new Date('2026-07-10T12:00:00.000Z');

  it('marks same-day as fresh', () => {
    const result = computeApprovalAgeing({
      stepEnteredAt: '2026-07-10T08:00:00.000Z',
      requestedAt: '2026-07-09T08:00:00.000Z',
      escalated: false,
      now,
    });
    expect(result.level).toBe('fresh');
    expect(result.days).toBe(0);
    expect(result.label).toBe('Today');
  });

  it('marks 1–2 days as aging', () => {
    const result = computeApprovalAgeing({
      stepEnteredAt: '2026-07-08T12:00:00.000Z',
      requestedAt: '2026-07-01T12:00:00.000Z',
      escalated: false,
      now,
    });
    expect(result.level).toBe('aging');
    expect(result.days).toBe(2);
  });

  it('marks 3+ days as stale', () => {
    const result = computeApprovalAgeing({
      stepEnteredAt: null,
      requestedAt: '2026-07-01T12:00:00.000Z',
      escalated: false,
      now,
    });
    expect(result.level).toBe('stale');
    expect(result.days).toBe(9);
  });

  it('prefers escalated level when flag is set', () => {
    const result = computeApprovalAgeing({
      stepEnteredAt: '2026-07-10T08:00:00.000Z',
      requestedAt: '2026-07-10T08:00:00.000Z',
      escalated: true,
      now,
    });
    expect(result.level).toBe('escalated');
    expect(result.label).toContain('Escalated');
  });
});
