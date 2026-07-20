import {
  signaturesPresentOnVoucher,
  validateLabourVoucherForm,
} from '../validateVoucher';
import type { LabourVoucherFormValues } from '../types';

const baseForm = (): LabourVoucherFormValues => ({
  recipientName: 'Mason gang A',
  recipientMobile: '',
  workDescription: 'Block work',
  attendanceQuantity: '2',
  rate: '1000',
  deductions: '50',
  pettyCashAccountId: '507f1f77bcf86cd799439011',
  requiresWitnessSignature: true,
  requiresRecipientPhoto: false,
});

describe('validateLabourVoucherForm', () => {
  it('accepts a reconciled form without signature checks', () => {
    const result = validateLabourVoucherForm(baseForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amounts).toMatchObject({
        grossAmount: 2000,
        deductions: 50,
        netAmount: 1950,
      });
    }
  });

  it('requires configured signatures before submit', () => {
    const missing = validateLabourVoucherForm(baseForm(), {
      requireSignatures: true,
      signatures: {
        recipient_signature: true,
        engineer_signature: true,
      },
    });
    expect(missing).toEqual({
      ok: false,
      error: 'Witness signature is required by configuration',
    });

    const ok = validateLabourVoucherForm(baseForm(), {
      requireSignatures: true,
      signatures: {
        recipient_signature: true,
        engineer_signature: true,
        witness_signature: true,
      },
    });
    expect(ok.ok).toBe(true);
  });
});

describe('signaturesPresentOnVoucher', () => {
  it('enforces Nest signature configuration', () => {
    expect(
      signaturesPresentOnVoucher({
        recipientSignatureDocumentId: 'a',
        engineerSignatureDocumentId: 'b',
        witnessSignatureDocumentId: null,
        recipientPhotoDocumentId: null,
        requiresWitnessSignature: true,
        requiresRecipientPhoto: false,
      }),
    ).toMatchObject({ ok: false });

    expect(
      signaturesPresentOnVoucher({
        recipientSignatureDocumentId: 'a',
        engineerSignatureDocumentId: 'b',
        witnessSignatureDocumentId: 'c',
        recipientPhotoDocumentId: null,
        requiresWitnessSignature: true,
        requiresRecipientPhoto: false,
      }),
    ).toEqual({ ok: true });
  });
});
