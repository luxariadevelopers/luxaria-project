import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/api/client';
import type { ProjectOption } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { tokenStorage } from '@/auth/tokenStorage';

type ProjectContextValue = {
  projects: ProjectOption[];
  selectedProjectId: string | null;
  selectedProject: ProjectOption | null;
  isLoading: boolean;
  needsProjectSelection: boolean;
  setSelectedProjectId: (id: string | null) => Promise<void>;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasPermission, isBootstrapping } = useAuth();
  const [selectedProjectId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isBootstrapping) {
      setSelectedId(tokenStorage.getSelectedProjectId());
      setReady(true);
    }
  }, [isBootstrapping]);

  const canViewProjects = hasPermission('project.view');

  const projectsQuery = useQuery({
    queryKey: ['projects', 'mobile'],
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

  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  const setSelectedProjectId = useCallback(async (id: string | null) => {
    await tokenStorage.setSelectedProjectId(id);
    setSelectedId(id);
  }, []);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const needsProjectSelection =
    isAuthenticated &&
    ready &&
    !selectedProjectId &&
    (canViewProjects ? !projectsQuery.isLoading : true);

  const value = useMemo(
    () => ({
      projects,
      selectedProjectId,
      selectedProject,
      isLoading: !ready || projectsQuery.isLoading,
      needsProjectSelection,
      setSelectedProjectId,
    }),
    [
      projects,
      selectedProjectId,
      selectedProject,
      ready,
      projectsQuery.isLoading,
      needsProjectSelection,
      setSelectedProjectId,
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
