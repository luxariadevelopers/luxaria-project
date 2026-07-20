/**
 * Display helpers for investor bank fields.
 * Nest returns `accountNumber` only for owner / `investor.view_all`;
 * otherwise `null` with `accountNumberLast4` still present.
 * UI keeps numbers masked by default even when decrypt is available.
 */

export type AccountDisplay = {
  /** What to show in the bank card. */
  display: string;
  /** True when a full number is available from the API. */
  canReveal: boolean;
  /** True when currently showing the full account number. */
  isRevealed: boolean;
};

export function formatMaskedAccountLast4(
  last4: string | null | undefined,
): string {
  if (!last4 || last4.trim() === '') {
    return '••••';
  }
  return `••••${last4.trim().slice(-4)}`;
}

export function resolveAccountDisplay(args: {
  accountNumber: string | null | undefined;
  accountNumberLast4: string | null | undefined;
  revealed: boolean;
}): AccountDisplay {
  const canReveal = Boolean(args.accountNumber && args.accountNumber.length > 0);
  if (args.revealed && canReveal) {
    return {
      display: args.accountNumber as string,
      canReveal: true,
      isRevealed: true,
    };
  }
  return {
    display: formatMaskedAccountLast4(args.accountNumberLast4),
    canReveal,
    isRevealed: false,
  };
}

/** Mask PAN for display unless explicitly revealed. */
export function formatMaskedPan(
  pan: string | null | undefined,
  revealed: boolean,
): string {
  if (!pan || pan.trim() === '') return '—';
  if (revealed) return pan.trim().toUpperCase();
  const value = pan.trim().toUpperCase();
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}
