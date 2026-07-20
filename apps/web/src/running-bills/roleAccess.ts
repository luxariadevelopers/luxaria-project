/**
 * Nest RBAC for contractor running bills (`CONTRACTOR_BILLS_API.md`).
 *
 * Prompt alias `running_bill.submit` is **not** a Nest code — submit-claim
 * uses `running_bill.create`. Finance check uses `running_bill.finance_verify`.
 */

export type RunningBillCapabilities = {
  canView: boolean;
  /** Create, update draft/rejected, submit-claim, cancel. */
  canCreate: boolean;
  /** Alias of `canCreate` for submit clarity. */
  canSubmit: boolean;
  /** Engineer verify + reject. */
  canVerify: boolean;
  /** PM certify. */
  canCertify: boolean;
  /** Finance verification. */
  canFinanceVerify: boolean;
  /** Director approve. */
  canApprove: boolean;
  canPost: boolean;
  canMarkPaid: boolean;
  /** Measurement selector — Nest `measurement.view`. */
  canViewMeasurements: boolean;
  /** Agreement picker — Nest `contractor_agreement.view`. */
  canViewAgreements: boolean;
  /** Contractor picker — Nest `contractor.view`. */
  canViewContractors: boolean;
};

export function resolveRunningBillCapabilities(
  hasPermission: (code: string) => boolean,
): RunningBillCapabilities {
  const canCreate = hasPermission('running_bill.create');
  return {
    canView: hasPermission('running_bill.view'),
    canCreate,
    canSubmit: canCreate,
    canVerify: hasPermission('running_bill.verify'),
    canCertify: hasPermission('running_bill.certify'),
    canFinanceVerify: hasPermission('running_bill.finance_verify'),
    canApprove: hasPermission('running_bill.approve'),
    canPost: hasPermission('running_bill.post'),
    canMarkPaid: hasPermission('running_bill.pay'),
    canViewMeasurements: hasPermission('measurement.view'),
    canViewAgreements: hasPermission('contractor_agreement.view'),
    canViewContractors: hasPermission('contractor.view'),
  };
}
