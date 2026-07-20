const ACCESS_KEY = 'luxaria.accessToken';
const REFRESH_KEY = 'luxaria.refreshToken';
const USER_KEY = 'luxaria.user';
const PROJECT_KEY = 'luxaria.selectedProjectId';

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setUser(user: unknown) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem(USER_KEY);
  },
  getSelectedProjectId(): string | null {
    return localStorage.getItem(PROJECT_KEY);
  },
  setSelectedProjectId(projectId: string | null) {
    if (!projectId) {
      localStorage.removeItem(PROJECT_KEY);
      return;
    }
    localStorage.setItem(PROJECT_KEY, projectId);
  },
  clearAll() {
    this.clearTokens();
    this.clearUser();
    this.setSelectedProjectId(null);
  },
};
