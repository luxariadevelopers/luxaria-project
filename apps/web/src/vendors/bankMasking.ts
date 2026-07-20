/**
 * Vendor bank display helpers.
 * Nest `GET /vendors/:id` may decrypt `accountNumber` for viewers; the UI
 * still masks by default and only reveals on explicit user action.
 */

export type AccountDisplay = {
  display: string;
  canReveal: boolean;
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

/** Client safety net — never bind a full account number into list rows. */
export function toListSafeVendorBank(bank: {
  bankName: string | null;
  branchName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  accountNumberLast4: string | null;
}): {
  bankName: string | null;
  branchName: string | null;
  ifsc: string | null;
  accountHolderName: string | null;
  accountNumber: null;
  accountNumberLast4: string | null;
} {
  return {
    bankName: bank.bankName,
    branchName: bank.branchName,
    ifsc: bank.ifsc,
    accountHolderName: bank.accountHolderName,
    accountNumber: null,
    accountNumberLast4: bank.accountNumberLast4,
  };
}
