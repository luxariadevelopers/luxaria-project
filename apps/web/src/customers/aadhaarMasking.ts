/**
 * Display helpers for customer Aadhaar fields.
 * Nest returns full `aadhaar` only when actor has `customer.manage`
 * (prompt alias `customer.view_sensitive`). UI keeps values masked by default.
 */

export type AadhaarDisplay = {
  display: string;
  canReveal: boolean;
  isRevealed: boolean;
};

/** Mask last-4 reference as `XXXX-XXXX-1234`. */
export function formatMaskedAadhaarReference(
  reference: string | null | undefined,
): string {
  if (!reference || reference.trim() === '') {
    return '—';
  }
  const last4 = reference.trim().slice(-4);
  return `XXXX-XXXX-${last4}`;
}

export function resolveAadhaarDisplay(args: {
  aadhaar: string | null | undefined;
  aadhaarReference: string | null | undefined;
  /** Nest decrypt available (`customer.manage`). */
  canViewSensitive: boolean;
  revealed: boolean;
}): AadhaarDisplay {
  const canReveal =
    args.canViewSensitive && Boolean(args.aadhaar && args.aadhaar.length > 0);

  if (args.revealed && canReveal && args.aadhaar) {
    const digits = args.aadhaar.replace(/[\s-]/g, '');
    if (digits.length === 12) {
      return {
        display: `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`,
        canReveal: true,
        isRevealed: true,
      };
    }
    return {
      display: args.aadhaar,
      canReveal: true,
      isRevealed: true,
    };
  }

  return {
    display: formatMaskedAadhaarReference(args.aadhaarReference),
    canReveal,
    isRevealed: false,
  };
}
