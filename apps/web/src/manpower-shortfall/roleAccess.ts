/**
 * Nest RBAC for Manpower Shortfall (exact catalog):
 * - `manpower_shortfall.view` — list alerts
 * - `manpower_shortfall.acknowledge` — evaluate + acknowledge
 * - `manpower_plan.view` — compare (schedule-impact panel)
 *
 * Phase prompt alias `manpower_shortfall.escalate` is not in the Nest catalog —
 * escalate/acknowledge maps to `manpower_shortfall.acknowledge`.
 */
export type ManpowerShortfallCapabilities = {
  canView: boolean;
  canAcknowledge: boolean;
  /** Alias for escalate workflows (Nest `manpower_shortfall.acknowledge`). */
  canEscalate: boolean;
  canCompare: boolean;
};

export function resolveManpowerShortfallCapabilities(
  hasPermission: (code: string) => boolean,
): ManpowerShortfallCapabilities {
  const canAcknowledge = hasPermission('manpower_shortfall.acknowledge');
  return {
    canView: hasPermission('manpower_shortfall.view'),
    canAcknowledge,
    canEscalate: canAcknowledge,
    canCompare: hasPermission('manpower_plan.view'),
  };
}
