/**
 * Nest RBAC for Measurement Book:
 * - `measurement.view` — list / get
 * - `measurement.create` — create, update, submit, acknowledge, cancel, revise
 * - `measurement.certify` — verify, certify, reject
 */
export type MeasurementBookCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canCertify: boolean;
  canViewBoq: boolean;
  canViewContractors: boolean;
};

export function resolveMeasurementBookCapabilities(
  hasPermission: (code: string) => boolean,
): MeasurementBookCapabilities {
  return {
    canView: hasPermission('measurement.view'),
    canCreate: hasPermission('measurement.create'),
    canCertify: hasPermission('measurement.certify'),
    canViewBoq: hasPermission('boq.view'),
    canViewContractors: hasPermission('contractor.view'),
  };
}
