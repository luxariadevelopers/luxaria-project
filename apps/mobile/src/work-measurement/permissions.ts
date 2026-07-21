/**
 * Nest RBAC codes for Work Measurements (exact catalog):
 * - `measurement.view` — list / get
 * - `measurement.create` — create, update, submit, cancel
 * - `measurement.certify` — verify / acknowledge, reject, certify (engineer)
 *
 * Phase brief alias `work_measurement.create` is not in the Nest catalog.
 */

export type WorkMeasurementCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canSubmit: boolean;
  /** Engineer acknowledge (verify) — online only. */
  canAcknowledge: boolean;
  /** BOQ item selector — `GET /boq/projects/:projectId/items`. */
  canViewBoq: boolean;
  /** Contractor selector — `GET /contractors`. */
  canViewContractors: boolean;
};

export function resolveWorkMeasurementCapabilities(
  hasPermission: (code: string) => boolean,
): WorkMeasurementCapabilities {
  const canCreate = hasPermission('measurement.create');
  return {
    canView: hasPermission('measurement.view'),
    canCreate,
    canSubmit: canCreate,
    canAcknowledge: hasPermission('measurement.certify'),
    canViewBoq: hasPermission('boq.view'),
    canViewContractors: hasPermission('contractor.view'),
  };
}
