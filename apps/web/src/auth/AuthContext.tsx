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
  fetchCurrentUser,
  fetchMyPermissions,
  loginRequest,
  logoutRequest,
  type LoginPayload,
} from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import type { AuthUser, UserAccess } from '@/api/types';
import { tokenStorage } from './tokenStorage';

type AuthContextValue = {
  user: AuthUser | null;
  access: UserAccess | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() =>
    tokenStorage.getUser<AuthUser>(),
  );
  const [bootstrapped, setBootstrapped] = useState(false);

  const hasToken = Boolean(tokenStorage.getAccessToken());

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetchCurrentUser();
      return res.data ?? null;
    },
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  const accessQuery = useQuery({
    queryKey: ['auth', 'permissions'],
    queryFn: async () => {
      const res = await fetchMyPermissions();
      return res.data ?? null;
    },
    enabled: hasToken && Boolean(meQuery.data || user),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!hasToken) {
      setBootstrapped(true);
      return;
    }
    if (meQuery.isFetched || meQuery.isError) {
      if (meQuery.data) {
        setUser(meQuery.data);
        tokenStorage.setUser(meQuery.data);
      }
      if (meQuery.isError) {
        tokenStorage.clearAll();
        setUser(null);
      }
      setBootstrapped(true);
    }
  }, [hasToken, meQuery.data, meQuery.isError, meQuery.isFetched]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await loginRequest(payload);
      const data = res.data;
      if (!data) {
        throw new Error(res.message || 'Login failed');
      }
      tokenStorage.setTokens(data.accessToken, data.refreshToken);
      tokenStorage.setUser(data.user);
      setUser(data.user);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      // ignore logout network errors
    } finally {
      tokenStorage.clearAll();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const access = accessQuery.data ?? null;

  const hasPermission = useCallback(
    (permission: string) => {
      if (!access) return false;
      if (access.bypassPermissions) return true;
      return access.permissions.includes(permission);
    },
    [access],
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!access) return false;
      if (access.bypassPermissions) return true;
      return permissions.some((p) => access.permissions.includes(p));
    },
    [access],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]) => {
      if (!access) return false;
      if (access.bypassPermissions) return true;
      return permissions.every((p) => access.permissions.includes(p));
    },
    [access],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      access,
      isAuthenticated: Boolean(user && tokenStorage.getAccessToken()),
      isBootstrapping: !bootstrapped || (hasToken && meQuery.isLoading),
      login,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    }),
    [
      user,
      access,
      bootstrapped,
      hasToken,
      meQuery.isLoading,
      login,
      logout,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export { getErrorMessage };
