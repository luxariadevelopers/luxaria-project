/**
 * Nest permissions for bank reconciliation
 * (`bank-reconciliation.controller.ts`):
 * - `bank_reconciliation.view` — list/get sessions, lines, unmatched, matches, statement
 * - `bank_reconciliation.manage` — create session, column mapping, complete (finalise)
 * - `bank_reconciliation.import` — statement CSV/XLSX import
 * - `bank_reconciliation.match` — auto-match, manual match, unmatch
 * - `bank_reconciliation.post` — post bank charges / interest adjustments
 *
 * Prompt alias `bank_reconciliation.finalise` does **not** exist — completion
 * uses `bank_reconciliation.manage` (`POST …/complete`).
 */

export type BankReconciliationCapabilities = {
  canView: boolean;
  canManage: boolean;
  canImport: boolean;
  canMatch: boolean;
  canPost: boolean;
  /** Complete / finalise session — Nest `bank_reconciliation.manage`. */
  canFinalise: boolean;
};

export function resolveBankReconciliationCapabilities(
  hasPermission: (code: string) => boolean,
): BankReconciliationCapabilities {
  const canManage = hasPermission('bank_reconciliation.manage');
  return {
    canView: hasPermission('bank_reconciliation.view'),
    canManage,
    canImport: hasPermission('bank_reconciliation.import'),
    canMatch: hasPermission('bank_reconciliation.match'),
    canPost: hasPermission('bank_reconciliation.post'),
    canFinalise: canManage,
  };
}
