/** Stable React Query keys for project context (web + mobile). */
export const PROJECT_ACCESS_ME_QUERY_KEY = ['project-access', 'me'] as const;

export const PROJECTS_SELECTOR_QUERY_KEY = ['projects', 'selector'] as const;

/** Build a project-scoped list/detail query key. */
export function projectScopedQueryKey(
  resource: string,
  projectId: string | null,
  ...rest: unknown[]
): readonly unknown[] {
  return [resource, projectId, ...rest] as const;
}
