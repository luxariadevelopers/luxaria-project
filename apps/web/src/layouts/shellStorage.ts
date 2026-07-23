const SIDEBAR_COLLAPSED_KEY = 'luxaria.web.sidebarCollapsed';
const FREQUENT_ROUTES_KEY = 'luxaria.web.frequentRoutes';
const FREQUENT_MAX = 5;

export type FrequentRouteEntry = {
  to: string;
  label: string;
  icon?: string;
};

export const shellStorage = {
  getSidebarCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  },
  setSidebarCollapsed(collapsed: boolean): void {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  },

  getFrequentRoutes(): FrequentRouteEntry[] {
    try {
      const raw = sessionStorage.getItem(FREQUENT_ROUTES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (row): row is FrequentRouteEntry =>
            Boolean(
              row &&
                typeof row === 'object' &&
                typeof (row as FrequentRouteEntry).to === 'string' &&
                typeof (row as FrequentRouteEntry).label === 'string',
            ),
        )
        .slice(0, FREQUENT_MAX);
    } catch {
      return [];
    }
  },

  /** Most-recent-first; de-duplicates by `to`. */
  recordFrequentRoute(entry: FrequentRouteEntry): void {
    try {
      const prev = shellStorage.getFrequentRoutes().filter(
        (row) => row.to !== entry.to,
      );
      const next = [entry, ...prev].slice(0, FREQUENT_MAX);
      sessionStorage.setItem(FREQUENT_ROUTES_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },
};
