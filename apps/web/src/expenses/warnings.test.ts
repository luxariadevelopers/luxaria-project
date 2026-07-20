import { describe, expect, it } from 'vitest';
import {
  evidenceCount,
  hasBackdatedWarning,
  hasDuplicateBillWarning,
  hasGpsWarning,
} from './warnings';
import { SiteExpenseAttachmentType } from './types';

describe('expense warning helpers', () => {
  it('detects GPS and duplicate Nest warning strings', () => {
    const warnings = [
      'Expense date is backdated',
      'GPS is outside project radius (812m > 500m)',
      'Possible duplicate bill (EXP-2026-000001)',
    ];
    expect(hasGpsWarning(warnings)).toBe(true);
    expect(hasDuplicateBillWarning(warnings)).toBe(true);
    expect(hasBackdatedWarning(warnings)).toBe(true);
    expect(hasGpsWarning([])).toBe(false);
    expect(hasDuplicateBillWarning(['unrelated'])).toBe(false);
  });

  it('counts evidence attachments', () => {
    expect(evidenceCount({ attachments: [] })).toBe(0);
    expect(
      evidenceCount({
        attachments: [
          {
            id: '1',
            type: SiteExpenseAttachmentType.Bill,
            fileName: 'b.pdf',
            filePath: '/b',
            documentId: null,
            mimeType: null,
          },
          {
            id: '2',
            type: SiteExpenseAttachmentType.Photo,
            fileName: 'p.jpg',
            filePath: '/p',
            documentId: null,
            mimeType: null,
          },
        ],
      }),
    ).toBe(2);
  });
});
