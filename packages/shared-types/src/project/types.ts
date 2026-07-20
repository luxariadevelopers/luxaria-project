/**
 * Shape of `GET /api/v1/project-access/me` → `data`.
 * Backend: `ProjectAccessService.listAccessibleProjectIds`.
 */
export type ProjectAccessScope = {
  globalAccess: boolean;
  projectIds: string[];
};

/** Minimal project row for selectors / badges (from `GET /projects`). */
export type ProjectOption = {
  id: string;
  projectCode: string;
  projectName: string;
  status?: string;
};
