/**
 * Display helpers for company bank accounts.
 * List APIs never return full numbers; detail may include `accountNumber`
 * only when Nest decrypts (`bank.view_sensitive` / `bank.manage`).
 * UI keeps numbers masked by default even when decrypt is available.
 */

export type AccountNumberDisplay = {
  display: string;
  canReveal: boolean;
  isRevealed: boolean;
};

/** Prefer Nest `maskedAccountNumber` (e.g. XXXXXX9012); fall back to last4. */
export function formatMaskedAccountNumber(
  masked: string | null | undefined,
): string {
  if (!masked || masked.trim() === '') {
    return '••••';
  }
  return masked.trim().toUpperCase();
}

export function last4FromMasked(
  masked: string | null | undefined,
): string | null {
  if (!masked) return null;
  const digits = masked.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export function resolveBankAccountNumberDisplay(args: {
  maskedAccountNumber: string | null | undefined;
  accountNumber: string | null | undefined;
  revealed: boolean;
}): AccountNumberDisplay {
  const canReveal = Boolean(
    args.accountNumber && args.accountNumber.length > 0,
  );
  if (args.revealed && canReveal) {
    return {
      display: args.accountNumber as string,
      canReveal: true,
      isRevealed: true,
    };
  }
  return {
    display: formatMaskedAccountNumber(args.maskedAccountNumber),
    canReveal,
    isRevealed: false,
  };
}

/**
 * Strip any accidental full account number from a list row before render.
 * Nest list already nulls `accountNumber`; this is a client safety net.
 */
export function toListSafeBankAccount<
  T extends { accountNumber: string | null; maskedAccountNumber: string },
>(row: T): T {
  return {
    ...row,
    accountNumber: null,
  };
}
