import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet } from '@/api/client';
import type { SiteOption } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { tokenStorage } from '@/auth/tokenStorage';
import { useProject } from '@/context/ProjectContext';

type SiteContextValue = {
  sites: SiteOption[];
  selectedSiteId: string | null;
  selectedSite: SiteOption | null;
  authorisedSiteIds: string[];
  isLoading: boolean;
  setSelectedSiteId: (id: string | null) => Promise<void>;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasPermission, isBootstrapping } = useAuth();
  const { selectedProjectId } = useProject();
  const queryClient = useQueryClient();
  const [selectedSiteId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const previousProjectIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isBootstrapping) {
      setSelectedId(tokenStorage.getSelectedSiteId());
      setReady(true);
    }
  }, [isBootstrapping]);

  useEffect(() => {
    if (!isAuthenticated && ready) {
      setSelectedId(null);
      previousProjectIdRef.current = undefined;
    }
  }, [isAuthenticated, ready]);

  const canViewSites = hasPermission('site_access.view');

  const sitesQuery = useQuery({
    queryKey: ['sites', 'mobile', selectedProjectId],
    queryFn: async () => {
      const res = await apiGet<SiteOption[]>('/site-access/me', {
        projectId: selectedProjectId ?? undefined,
      });
      return res.data ?? [];
    },
    enabled: isAuthenticated && canViewSites && Boolean(selectedProjectId),
    staleTime: 60_000,
    retry: false,
  });

  const sites = useMemo(() => sitesQuery.data ?? [], [sitesQuery.data]);
  const authorisedSiteIds = useMemo(() => sites.map((s) => s.id), [sites]);

  // Clear site selection when the active project changes.
  useEffect(() => {
    if (!ready) return;
    if (previousProjectIdRef.current === undefined) {
      previousProjectIdRef.current = selectedProjectId;
      return;
    }
    if (previousProjectIdRef.current === selectedProjectId) return;
    previousProjectIdRef.current = selectedProjectId;
    void tokenStorage.setSelectedSiteId(null);
    setSelectedId(null);
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === 'sites';
      },
    });
  }, [ready, selectedProjectId, queryClient]);

  // Drop stale selection / auto-pick when only one authorised site exists.
  useEffect(() => {
    if (!ready || sitesQuery.isLoading) return;
    if (!selectedProjectId) {
      if (selectedSiteId) {
        void tokenStorage.setSelectedSiteId(null);
        setSelectedId(null);
      }
      return;
    }
    if (sites.length === 0) {
      if (selectedSiteId) {
        void tokenStorage.setSelectedSiteId(null);
        setSelectedId(null);
      }
      return;
    }
    if (selectedSiteId && sites.some((s) => s.id === selectedSiteId)) {
      return;
    }
    const nextId = sites.length === 1 ? sites[0]!.id : null;
    void tokenStorage.setSelectedSiteId(nextId);
    setSelectedId(nextId);
  }, [
    ready,
    sitesQuery.isLoading,
    sites,
    selectedProjectId,
    selectedSiteId,
  ]);

  const setSelectedSiteId = useCallback(
    async (id: string | null) => {
      if (id && sites.length > 0 && !sites.some((s) => s.id === id)) {
        return;
      }
      await tokenStorage.setSelectedSiteId(id);
      setSelectedId(id);
    },
    [sites],
  );

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === selectedSiteId) ?? null,
    [sites, selectedSiteId],
  );

  const value = useMemo(
    () => ({
      sites,
      selectedSiteId,
      selectedSite,
      authorisedSiteIds,
      isLoading: !ready || (Boolean(selectedProjectId) && sitesQuery.isLoading),
      setSelectedSiteId,
    }),
    [
      sites,
      selectedSiteId,
      selectedSite,
      authorisedSiteIds,
      ready,
      selectedProjectId,
      sitesQuery.isLoading,
      setSelectedSiteId,
    ],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used within SiteProvider');
  }
  return ctx;
}
