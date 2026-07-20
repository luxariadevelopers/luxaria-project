const SIDEBAR_COLLAPSED_KEY = 'luxaria.sidebarCollapsed';

export const shellStorage = {
  getSidebarCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  },
  setSidebarCollapsed(collapsed: boolean) {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore quota / private mode
    }
  },
};
