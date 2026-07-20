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
import { getErrorMessage, isForbiddenError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { isProjectAuthorised } from './access';
import { fetchInvestorPortalMe, fetchInvestorPortalProjects } from './api';
import { investorProjectStorage } from './investorProjectStorage';
import type { InvestorPortalMe, InvestorPortalProjectSummary } from './types';

type InvestorPortalContextValue = {
  profile: InvestorPortalMe | null;
  projects: InvestorPortalProjectSummary[];
  selectedProjectId: string | null;
  selectedProject: InvestorPortalProjectSummary | null;
  setSelectedProjectId: (projectId: string | null) => void;
  isProfileLoading: boolean;
  isProjectsLoading: boolean;
  profileError: unknown;
  projectsError: unknown;
  isProfileForbidden: boolean;
  isProjectsForbidden: boolean;
  refetchProfile: () => void;
  refetchProjects: () => void;
};

const InvestorPortalContext = createContext<InvestorPortalContextValue | null>(
  null,
);

export function InvestorPortalProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(
    () => investorProjectStorage.getSelectedProjectId(),
  );

  const profileQuery = useQuery({
    queryKey: ['investor-portal', 'me'],
    queryFn: async () => {
      const res = await fetchInvestorPortalMe();
      return res.data ?? null;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const projectsQuery = useQuery({
    queryKey: ['investor-portal', 'projects'],
    queryFn: async () => {
      const res = await fetchInvestorPortalProjects();
      return res.data ?? [];
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  useEffect(() => {
    if (!projects.length) return;
    const stillValid = projects.some(
      (p: InvestorPortalProjectSummary) => p.projectId === selectedProjectId,
    );
    if (selectedProjectId && stillValid) return;
    const nextId = projects[0]?.projectId ?? null;
    setSelectedProjectIdState(nextId);
    investorProjectStorage.setSelectedProjectId(nextId);
  }, [projects, selectedProjectId]);

  const setSelectedProjectId = useCallback(
    (projectId: string | null) => {
      if (
        projectId &&
        projects.length > 0 &&
        !isProjectAuthorised(
          projectId,
          projects.map((p) => p.projectId),
        )
      ) {
        return;
      }
      setSelectedProjectIdState(projectId);
      investorProjectStorage.setSelectedProjectId(projectId);
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === 'investor-portal' &&
            key[1] !== 'me' &&
            key[1] !== 'projects'
          );
        },
      });
    },
    [projects, queryClient],
  );

  const selectedProject = useMemo(
    () => projects.find((p: InvestorPortalProjectSummary) => p.projectId === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const value = useMemo<InvestorPortalContextValue>(
    () => ({
      profile: profileQuery.data ?? null,
      projects,
      selectedProjectId,
      selectedProject,
      setSelectedProjectId,
      isProfileLoading: profileQuery.isLoading,
      isProjectsLoading: projectsQuery.isLoading,
      profileError: profileQuery.error,
      projectsError: projectsQuery.error,
      isProfileForbidden: isForbiddenError(profileQuery.error),
      isProjectsForbidden: isForbiddenError(projectsQuery.error),
      refetchProfile: () => {
        void profileQuery.refetch();
      },
      refetchProjects: () => {
        void projectsQuery.refetch();
      },
    }),
    [
      profileQuery.data,
      profileQuery.error,
      profileQuery.isLoading,
      profileQuery.refetch,
      projects,
      projectsQuery.error,
      projectsQuery.isLoading,
      projectsQuery.refetch,
      selectedProject,
      selectedProjectId,
      setSelectedProjectId,
    ],
  );

  return (
    <InvestorPortalContext.Provider value={value}>
      {children}
    </InvestorPortalContext.Provider>
  );
}

export function useInvestorPortal() {
  const ctx = useContext(InvestorPortalContext);
  if (!ctx) {
    throw new Error('useInvestorPortal must be used within InvestorPortalProvider');
  }
  return ctx;
}

export { getErrorMessage };
