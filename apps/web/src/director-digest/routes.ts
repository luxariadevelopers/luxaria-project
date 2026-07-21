/**
 * Route path helper — registry path in `navigation/routeRegistry.ts`.
 *
 * Chosen group: **administration** (`/administration/director-digest`)
 * Global-scope executive digest; not an accounting report. Matches director
 * RBAC and sits with audit logs / system health.
 */
export const DIRECTOR_DIGEST_ROUTES = {
  home: '/administration/director-digest',
} as const;
