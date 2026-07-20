import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PROJECT_ACCESS_ME_QUERY_KEY,
  PROJECTS_SELECTOR_QUERY_KEY,
  resolveProjectSelection,
  shouldPreserveQueryOnProjectSwitch,
  type ProjectAccessScope,
  type ProjectOption,
  type ProjectSelectionIssue,
} from '@luxaria/shared-types';
import { apiGet } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { tokenStorage } from '@/auth/tokenStorage';

type ProjectContextValue = {
  /** Access-scoped projects eligible for the selector. */
  projects: ProjectOption[];
  /** Raw list from `GET /projects` (before selectable filter). */
  allProjects: ProjectOption[];
  access: ProjectAccessScope | null;
  globalAccess: boolean;
  selectedProjectId: string | null;
  selectedProject: ProjectOption | null;
  isLoading: boolean;
  isReady: boolean;
  error: unknown;
  hasNoProjectAccess: boolean;
  /** True when a project-required surface has no valid active project. */
  needsProjectSelection: boolean;
  selectionIssue: ProjectSelectionIssue | null;
  setSelectedProjectId: (id: string | null) => void;
  refetch: () => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

function invalidateProjectScopedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      !shouldPreserveQueryOnProjectSwitch(query.queryKey),
  });
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedId] = useState<string | null>(() =>
    tokenStorage.getSelectedProjectId(),
  );

  const canViewProjects = hasPermission('project.view');

  const accessQuery = useQuery({
    queryKey: PROJECT_ACCESS_ME_QUERY_KEY,
    queryFn: async () => {
      const res = await apiGet<ProjectAccessScope>('/project-access/me');
      return (
        res.data ??
        ({ globalAccess: false, projectIds: [] } satisfies ProjectAccessScope)
      );
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  const projectsQuery = useQuery({
    queryKey: PROJECTS_SELECTOR_QUERY_KEY,
    queryFn: async () => {
      const res = await apiGet<ProjectOption[]>('/projects', {
        page: 1,
        limit: 100,
      });
      return res.data ?? [];
    },
    enabled: isAuthenticated && canViewProjects,
    staleTime: 60_000,
    retry: false,
  });

  const access = accessQuery.data ?? null;
  const allProjects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
  const accessReady = isAuthenticated && (accessQuery.isSuccess || accessQuery.isError);
  const projectsReady =
    !canViewProjects ||
    projectsQuery.isSuccess ||
    projectsQuery.isError ||
    (!projectsQuery.isFetching && !projectsQuery.isLoading);

  const resolved = useMemo(
    () =>
      resolveProjectSelection({
        persistedId: selectedProjectId,
        access,
        projects: canViewProjects ? allProjects : [],
        projectsReady: Boolean(projectsReady),
        accessReady: Boolean(accessReady && !accessQuery.isError),
        projectListAvailable: canViewProjects && !projectsQuery.isError,
      }),
    [
      selectedProjectId,
      access,
      allProjects,
      canViewProjects,
      projectsReady,
      accessReady,
      accessQuery.isError,
      projectsQuery.isError,
    ],
  );

  useEffect(() => {
    if (resolved.shouldClearPersisted && selectedProjectId) {
      tokenStorage.setSelectedProjectId(null);
      setSelectedId(null);
      invalidateProjectScopedQueries(queryClient);
    }
  }, [resolved.shouldClearPersisted, selectedProjectId, queryClient]);

  const setSelectedProjectId = useCallback(
    (id: string | null) => {
      if (id === selectedProjectId) {
        return;
      }
      tokenStorage.setSelectedProjectId(id);
      setSelectedId(id);
      invalidateProjectScopedQueries(queryClient);
    },
    [queryClient, selectedProjectId],
  );

  const refetch = useCallback(async () => {
    await Promise.all([
      accessQuery.refetch(),
      canViewProjects ? projectsQuery.refetch() : Promise.resolve(),
    ]);
  }, [accessQuery, projectsQuery, canViewProjects]);

  const isLoading =
    isAuthenticated &&
    (accessQuery.isLoading || (canViewProjects && projectsQuery.isLoading));

  const isReady = !isAuthenticated || (Boolean(accessReady) && Boolean(projectsReady));

  const hasNoProjectAccess =
    resolved.hasNoProjectAccess ||
    (isReady &&
      canViewProjects &&
      !accessQuery.isError &&
      access !== null &&
      !access.globalAccess &&
      resolved.selectableProjects.length === 0 &&
      allProjects.length === 0);

  const needsProjectSelection =
    isReady &&
    !isLoading &&
    !hasNoProjectAccess &&
    !resolved.activeProjectId;

  const error = accessQuery.error ?? projectsQuery.error ?? null;

  const value = useMemo(
    () => ({
      projects: resolved.selectableProjects,
      allProjects,
      access,
      globalAccess: access?.globalAccess ?? false,
      selectedProjectId: resolved.activeProjectId,
      selectedProject: resolved.activeProject,
      isLoading,
      isReady,
      error,
      hasNoProjectAccess,
      needsProjectSelection,
      selectionIssue: resolved.issue,
      setSelectedProjectId,
      refetch,
    }),
    [
      resolved.selectableProjects,
      resolved.activeProjectId,
      resolved.activeProject,
      resolved.issue,
      allProjects,
      access,
      isLoading,
      isReady,
      error,
      hasNoProjectAccess,
      needsProjectSelection,
      setSelectedProjectId,
      refetch,
    ],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return ctx;
}
