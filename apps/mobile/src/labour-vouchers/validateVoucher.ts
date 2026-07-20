import { deriveLabourAmounts } from './calculations';
import type {
  LabourVoucherAmounts,
  LabourVoucherFormValues,
  SignatureSlot,
} from './types';

export type SignaturePresence = Partial<Record<SignatureSlot, boolean>>;

export type VoucherValidationResult =
  | { ok: true; amounts: LabourVoucherAmounts }
  | { ok: false; error: string };

function isAmounts(
  value: ReturnType<typeof deriveLabourAmounts>,
): value is LabourVoucherAmounts {
  return !('error' in value);
}

/**
 * Client-side validation before create/submit.
 * Signature rules mirror Nest assertSignaturesPresent + config flags.
 */
export function validateLabourVoucherForm(
  form: LabourVoucherFormValues,
  options?: {
    requireSignatures?: boolean;
    signatures?: SignaturePresence;
  },
): VoucherValidationResult {
  if (!form.recipientName.trim()) {
    return { ok: false, error: 'Recipient / gang is required' };
  }
  if (!form.workDescription.trim()) {
    return { ok: false, error: 'Work description is required' };
  }
  if (!form.pettyCashAccountId.trim()) {
    return { ok: false, error: 'Select a petty-cash account (payment mode)' };
  }

  const amounts = deriveLabourAmounts({
    attendanceQuantity: form.attendanceQuantity,
    rate: form.rate,
    deductions: form.deductions || '0',
  });
  if (!isAmounts(amounts)) {
    return { ok: false, error: amounts.error };
  }

  if (options?.requireSignatures) {
    const sigs = options.signatures ?? {};
    if (!sigs.recipient_signature) {
      return { ok: false, error: 'Recipient signature is required' };
    }
    if (!sigs.engineer_signature) {
      return { ok: false, error: 'Engineer signature is required' };
    }
    if (form.requiresWitnessSignature && !sigs.witness_signature) {
      return { ok: false, error: 'Witness signature is required by configuration' };
    }
    if (form.requiresRecipientPhoto && !sigs.recipient_photo) {
      return { ok: false, error: 'Recipient photo is required by configuration' };
    }
  }

  return { ok: true, amounts };
}

export function signaturesPresentOnVoucher(voucher: {
  recipientSignatureDocumentId: string | null;
  engineerSignatureDocumentId: string | null;
  witnessSignatureDocumentId: string | null;
  recipientPhotoDocumentId: string | null;
  requiresWitnessSignature: boolean;
  requiresRecipientPhoto: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!voucher.recipientSignatureDocumentId) {
    return { ok: false, error: 'Recipient signature is required' };
  }
  if (!voucher.engineerSignatureDocumentId) {
    return { ok: false, error: 'Engineer signature is required' };
  }
  if (
    voucher.requiresWitnessSignature &&
    !voucher.witnessSignatureDocumentId
  ) {
    return { ok: false, error: 'Witness signature is required by configuration' };
  }
  if (voucher.requiresRecipientPhoto && !voucher.recipientPhotoDocumentId) {
    return { ok: false, error: 'Recipient photo is required by configuration' };
  }
  return { ok: true };
}
