/**
 * Nest RBAC for contractor payments (`CONTRACTOR_PAYMENTS_API.md`).
 *
 * Prompt aliases `contractor_payment.view/create/approve/release/post` are
 * **not** Nest codes. Nest uses:
 * - `payment.view` — list/get
 * - `payment.release` — create, update, submit, bank release, cancel
 * - `payment.approve` — approve, verify, post
 */

export type ContractorPaymentCapabilities = {
  canView: boolean;
  /** Create, update draft, submit, release, cancel. */
  canRelease: boolean;
  canCreate: boolean;
  canSubmit: boolean;
  canBankRelease: boolean;
  canCancel: boolean;
  /** Approve, verify, post. */
  canApprove: boolean;
  canVerify: boolean;
  canPost: boolean;
  canViewBankAccounts: boolean;
  canViewContractors: boolean;
  canViewRunningBills: boolean;
  canUploadDocument: boolean;
};

export function resolveContractorPaymentCapabilities(
  hasPermission: (code: string) => boolean,
): ContractorPaymentCapabilities {
  const canRelease = hasPermission('payment.release');
  const canApprove = hasPermission('payment.approve');
  return {
    canView: hasPermission('payment.view'),
    canRelease,
    canCreate: canRelease,
    canSubmit: canRelease,
    canBankRelease: canRelease,
    canCancel: canRelease,
    canApprove,
    canVerify: canApprove,
    canPost: canApprove,
    canViewBankAccounts: hasPermission('bank.view'),
    canViewContractors: hasPermission('contractor.view'),
    canViewRunningBills: hasPermission('running_bill.view'),
    canUploadDocument: hasPermission('document.upload'),
  };
}
