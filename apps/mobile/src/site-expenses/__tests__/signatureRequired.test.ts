import {
  assertSignatureReady,
  hasSignatureAttachment,
} from '../signatureRequired';
import { SiteExpenseAttachmentType } from '../types';

describe('assertSignatureReady', () => {
  it('blocks submit when signature required and missing', () => {
    expect(
      assertSignatureReady({ requiresSignature: true, hasSignature: false }),
    ).toEqual({
      ok: false,
      error: 'Signature is required for this expense category',
    });
  });

  it('allows submit when signature present or not required', () => {
    expect(
      assertSignatureReady({ requiresSignature: true, hasSignature: true }),
    ).toEqual({ ok: true });
    expect(
      assertSignatureReady({ requiresSignature: false, hasSignature: false }),
    ).toEqual({ ok: true });
  });
});

describe('hasSignatureAttachment', () => {
  it('detects signature attachment type', () => {
    expect(hasSignatureAttachment([])).toBe(false);
    expect(
      hasSignatureAttachment([
        { type: SiteExpenseAttachmentType.Bill },
        { type: SiteExpenseAttachmentType.Signature },
      ]),
    ).toBe(true);
  });
});
