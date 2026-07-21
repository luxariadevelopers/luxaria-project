/**
 * Nest RBAC codes for Work Measurements (exact catalog):
 * - `measurement.view` — list / get
 * - `measurement.create` — create, update, submit, cancel
 * - `measurement.certify` — verify, certify/approve, reject (engineer)
 *
 * Phase brief aliases (`work_measurement.view/create/verify`) are not in the
 * Nest catalog; verify/certify UI maps to `measurement.certify`.
 */
export type WorkMeasurementCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canSubmit: boolean;
  canVerify: boolean;
  canCertify: boolean;
  canReject: boolean;
  canCancel: boolean;
  /** BOQ item selector — `GET /boq/projects/:projectId/items`. */
  canViewBoq: boolean;
  /** Contractor selector — `GET /contractors`. */
  canViewContractors: boolean;
};

export function resolveWorkMeasurementCapabilities(
  hasPermission: (code: string) => boolean,
): WorkMeasurementCapabilities {
  const canCreate = hasPermission('measurement.create');
  const canCertify = hasPermission('measurement.certify');
  return {
    canView: hasPermission('measurement.view'),
    canCreate,
    canUpdate: canCreate,
    canSubmit: canCreate,
    canVerify: canCertify,
    canCertify,
    canReject: canCertify,
    canCancel: canCreate,
    canViewBoq: hasPermission('boq.view'),
    canViewContractors: hasPermission('contractor.view'),
  };
}

/** Verifier must differ from measuredBy (Nest rule). */
export function canVerifyMeasurement(
  caps: WorkMeasurementCapabilities,
  measuredBy: string,
  currentUserId: string | undefined,
): boolean {
  if (!caps.canVerify || !currentUserId) {
    return false;
  }
  return measuredBy !== currentUserId;
}
