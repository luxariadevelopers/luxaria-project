/**
 * Route project vs active/authorised project (Micro Phase 024).
 * Hiding UI is not enough — callers must block the screen when not `ok`.
 */

export type RouteProjectAccessResult =
  | 'ok'
  | 'unauthorised'
  | 'mismatch'
  | 'no_selection'
  | 'invalid_id';

const MONGO_ID_RE = /^[a-f\d]{24}$/i;

export function isMongoObjectId(value: string | null | undefined): boolean {
  return Boolean(value && MONGO_ID_RE.test(value));
}

export function evaluateRouteProjectAccess(input: {
  routeProjectId: string | undefined;
  selectedProjectId: string | null;
  /** Accessible / selectable project ids from project context. */
  accessibleProjectIds: readonly string[];
}): RouteProjectAccessResult {
  const routeId = input.routeProjectId?.trim() ?? '';
  if (!routeId || !isMongoObjectId(routeId)) {
    return 'invalid_id';
  }

  if (!input.accessibleProjectIds.includes(routeId)) {
    return 'unauthorised';
  }

  if (!input.selectedProjectId) {
    return 'no_selection';
  }

  if (input.selectedProjectId !== routeId) {
    return 'mismatch';
  }

  return 'ok';
}
