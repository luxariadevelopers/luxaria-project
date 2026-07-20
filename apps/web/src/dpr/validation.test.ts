import { describe, expect, it } from 'vitest';
import { validateReopenPayload } from './validation';
import { resolveDprRowActions } from './workflowActions';
import { DprStatus } from './types';
import { resolveDprCapabilities } from './roleAccess';

describe('validateReopenPayload', () => {
  it('requires a non-empty trimmed reason', () => {
    expect(validateReopenPayload('')).toEqual({
      ok: false,
      message: 'Reopen reason is required.',
    });
    expect(validateReopenPayload('   ')).toEqual({
      ok: false,
      message: 'Reopen reason is required.',
    });
  });

  it('accepts valid reason for API DTO', () => {
    expect(validateReopenPayload('Incorrect labour count')).toEqual({
      ok: true,
      payload: { reason: 'Incorrect labour count' },
    });
  });

  it('rejects overlong reasons', () => {
    const long = 'x'.repeat(2001);
    const result = validateReopenPayload(long);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/at most 2000/);
    }
  });
});

describe('resolveDprRowActions — reopen flow gating', () => {
  const reviewer = resolveDprCapabilities((code) => code === 'dpr.review');
  const viewer = resolveDprCapabilities((code) => code === 'dpr.view');

  it('allows review only on submitted DPRs', () => {
    expect(
      resolveDprRowActions({ status: DprStatus.Submitted }, reviewer),
    ).toEqual(['review', 'reopen', 'regenerate_pdf']);
    expect(
      resolveDprRowActions({ status: DprStatus.Reviewed }, reviewer),
    ).toEqual(['reopen', 'regenerate_pdf']);
    expect(
      resolveDprRowActions({ status: DprStatus.Draft }, reviewer),
    ).toEqual([]);
  });

  it('hides review actions without dpr.review', () => {
    expect(
      resolveDprRowActions({ status: DprStatus.Submitted }, viewer),
    ).toEqual([]);
  });
});
