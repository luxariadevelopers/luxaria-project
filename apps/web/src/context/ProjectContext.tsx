import {
  createContext,
  useCallback,
  useContext,
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
  setSelectedProjectId: (id: string | null) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasPermission } = useAuth();
  const [selectedProjectId, setSelectedId] = useState<string | null>(() =>
    tokenStorage.getSelectedProjectId(),
  );

  const canViewProjects = hasPermission('project.view');

  const projectsQuery = useQuery({
    queryKey: ['projects', 'selector'],
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

  const projects: ProjectOption[] = projectsQuery.data ?? [];

  const setSelectedProjectId = useCallback((id: string | null) => {
    tokenStorage.setSelectedProjectId(id);
    setSelectedId(id);
  }, []);

  const selectedProject =
    projects.find((p: ProjectOption) => p.id === selectedProjectId) ?? null;

  const value = useMemo(
    () => ({
      projects,
      selectedProjectId,
      selectedProject,
      isLoading: projectsQuery.isLoading,
      setSelectedProjectId,
    }),
    [
      projects,
      selectedProjectId,
      selectedProject,
      projectsQuery.isLoading,
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
