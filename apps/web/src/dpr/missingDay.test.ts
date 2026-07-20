import { describe, expect, it } from 'vitest';
import { deriveDayCompliance } from './missingDay';

describe('deriveDayCompliance (cut-off + missing)', () => {
  it('marks missing when an unacknowledged missing-DPR alert exists', () => {
    expect(
      deriveDayCompliance({
        dpr: null,
        missingAlert: { id: 'a1' },
      }),
    ).toBe('missing');
  });

  it('is awaiting_cutoff when no DPR and no alert yet', () => {
    expect(
      deriveDayCompliance({
        dpr: null,
        missingAlert: null,
      }),
    ).toBe('awaiting_cutoff');
  });

  it('is complete when submitted or reviewed', () => {
    expect(
      deriveDayCompliance({
        dpr: { status: 'submitted' },
        missingAlert: null,
      }),
    ).toBe('complete');
    expect(
      deriveDayCompliance({
        dpr: { status: 'reviewed' },
        missingAlert: null,
      }),
    ).toBe('complete');
  });

  it('is pending for draft / reopened', () => {
    expect(
      deriveDayCompliance({
        dpr: { status: 'draft' },
        missingAlert: null,
      }),
    ).toBe('pending');
    expect(
      deriveDayCompliance({
        dpr: { status: 'reopened' },
        missingAlert: null,
      }),
    ).toBe('pending');
  });

  it('prefers missing alert over an existing draft DPR', () => {
    expect(
      deriveDayCompliance({
        dpr: { status: 'draft' },
        missingAlert: { id: 'a1' },
      }),
    ).toBe('missing');
  });
});
