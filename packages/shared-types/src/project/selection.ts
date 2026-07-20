import { isSelectableProjectStatus } from './status';
import type { ProjectAccessScope, ProjectOption } from './types';

export type ProjectSelectionIssue =
  | 'missing'
  | 'unassigned'
  | 'stale'
  | 'invalid_status';

export type ResolveProjectSelectionInput = {
  persistedId: string | null;
  access: ProjectAccessScope | null;
  /** Access-scoped projects from `GET /projects` (already filtered by backend). */
  projects: ProjectOption[];
  /** When true, projects query has settled (success or empty). */
  projectsReady: boolean;
  /** When true, access query has settled. */
  accessReady: boolean;
  /**
   * When false, the caller could not load `GET /projects` (e.g. missing
   * `project.view`). Validate against access scope only; do not treat
   * missing list rows as stale.
   */
  projectListAvailable?: boolean;
};

export type ResolveProjectSelectionResult = {
  /** Id safe to keep in storage / send as `X-Project-Id`. */
  activeProjectId: string | null;
  activeProject: ProjectOption | null;
  /** Persisted id was rejected and must be cleared. */
  shouldClearPersisted: boolean;
  issue: ProjectSelectionIssue | null;
  /** User has no assigned projects and no global access. */
  hasNoProjectAccess: boolean;
  /** Projects the user may pick in the selector. */
  selectableProjects: ProjectOption[];
};

/** Whether `projectId` is within the access scope from `/project-access/me`. */
export function isProjectInAccessScope(
  projectId: string,
  access: ProjectAccessScope,
): boolean {
  if (access.globalAccess) {
    return true;
  }
  return access.projectIds.includes(projectId);
}

/**
 * Filter list for the selector: must be in access scope and have a valid
 * workflow status. When status is omitted (older payloads), keep the row
 * if access allows — backend list is already scoped.
 */
export function filterSelectableProjects(
  projects: ProjectOption[],
  access: ProjectAccessScope | null,
): ProjectOption[] {
  if (!access) {
    return [];
  }
  return projects.filter((project) => {
    if (!isProjectInAccessScope(project.id, access)) {
      return false;
    }
    if (project.status === undefined || project.status === null) {
      return true;
    }
    return isSelectableProjectStatus(project.status);
  });
}

/**
 * Resolve persisted selection against access + project list.
 * Rejects stale / unassigned / Closed|Cancelled selections.
 */
export function resolveProjectSelection(
  input: ResolveProjectSelectionInput,
): ResolveProjectSelectionResult {
  const {
    persistedId,
    access,
    projects,
    projectsReady,
    accessReady,
    projectListAvailable = true,
  } = input;

  const hasNoProjectAccess =
    accessReady &&
    access !== null &&
    !access.globalAccess &&
    access.projectIds.length === 0;

  const selectableProjects =
    accessReady && access && projectListAvailable
      ? filterSelectableProjects(projects, access)
      : [];

  if (!accessReady || !projectsReady || !access) {
    return {
      activeProjectId: persistedId,
      activeProject: null,
      shouldClearPersisted: false,
      issue: persistedId ? null : 'missing',
      hasNoProjectAccess: false,
      selectableProjects,
    };
  }

  if (hasNoProjectAccess) {
    return {
      activeProjectId: null,
      activeProject: null,
      shouldClearPersisted: Boolean(persistedId),
      issue: 'unassigned',
      hasNoProjectAccess: true,
      selectableProjects: [],
    };
  }

  if (!persistedId) {
    return {
      activeProjectId: null,
      activeProject: null,
      shouldClearPersisted: false,
      issue: 'missing',
      hasNoProjectAccess: false,
      selectableProjects,
    };
  }

  if (!isProjectInAccessScope(persistedId, access)) {
    return {
      activeProjectId: null,
      activeProject: null,
      shouldClearPersisted: true,
      issue: 'unassigned',
      hasNoProjectAccess: false,
      selectableProjects,
    };
  }

  if (!projectListAvailable) {
    return {
      activeProjectId: persistedId,
      activeProject: null,
      shouldClearPersisted: false,
      issue: null,
      hasNoProjectAccess: false,
      selectableProjects,
    };
  }

  const match = projects.find((p) => p.id === persistedId);
  if (!match) {
    // Assigned id not in list → stale (revoked, deleted, or outside page).
    return {
      activeProjectId: null,
      activeProject: null,
      shouldClearPersisted: true,
      issue: 'stale',
      hasNoProjectAccess: false,
      selectableProjects,
    };
  }

  if (
    match.status !== undefined &&
    match.status !== null &&
    !isSelectableProjectStatus(match.status)
  ) {
    return {
      activeProjectId: null,
      activeProject: null,
      shouldClearPersisted: true,
      issue: 'invalid_status',
      hasNoProjectAccess: false,
      selectableProjects,
    };
  }

  return {
    activeProjectId: match.id,
    activeProject: match,
    shouldClearPersisted: false,
    issue: null,
    hasNoProjectAccess: false,
    selectableProjects,
  };
}

/**
 * React Query keys that must survive a project switch (auth + project meta).
 * Everything else is treated as potentially project-scoped and invalidated.
 */
export function shouldPreserveQueryOnProjectSwitch(
  queryKey: readonly unknown[],
): boolean {
  const root = queryKey[0];
  if (root === 'auth') {
    return true;
  }
  if (root === 'project-access') {
    return true;
  }
  if (root === 'projects' && queryKey[1] === 'selector') {
    return true;
  }
  return false;
}
