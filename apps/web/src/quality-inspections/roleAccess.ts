export type QualityInspectionCapabilities = {
  canView: boolean;
  /** Create, update, complete (result), cancel — Nest `quality.inspect`. */
  canInspect: boolean;
};

/**
 * Nest RBAC — exact codes are `quality.view` and `quality.inspect`.
 * Prompt aliases `quality_inspection.view|create|approve` are not catalogued.
 */
export function resolveQualityInspectionCapabilities(
  hasPermission: (code: string) => boolean,
): QualityInspectionCapabilities {
  return {
    canView: hasPermission('quality.view'),
    canInspect: hasPermission('quality.inspect'),
  };
}
