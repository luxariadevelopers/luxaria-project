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
import * as Device from 'expo-device';
import {
  fetchCurrentUser,
  fetchMyPermissions,
  loginRequest,
  logoutRequest,
  type LoginPayload,
} from '@/api/auth';
import { getErrorMessage } from '@/api/client';
import { setAuthFailureHandler } from '@/api/session';
import type { AuthUser, UserAccess } from '@/api/types';
import { tokenStorage } from './tokenStorage';

type AuthContextValue = {
  user: AuthUser | null;
  access: UserAccess | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (payload: Omit<LoginPayload, 'deviceName'>) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionEpoch, setSessionEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await tokenStorage.hydrate();
      if (!cancelled) {
        setUser(tokenStorage.getUser<AuthUser>());
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasToken = hydrated && Boolean(tokenStorage.getAccessToken());

  const meQuery = useQuery({
    queryKey: ['auth', 'me', sessionEpoch],
    queryFn: async () => {
      const res = await fetchCurrentUser();
      return res.data ?? null;
    },
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  const accessQuery = useQuery({
    queryKey: ['auth', 'permissions', sessionEpoch],
    queryFn: async () => {
      const res = await fetchMyPermissions();
      return res.data ?? null;
    },
    enabled: hasToken && Boolean(meQuery.data || user),
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!hydrated || !hasToken) {
      return;
    }
    if (meQuery.isFetched || meQuery.isError) {
      if (meQuery.data) {
        setUser(meQuery.data);
        void tokenStorage.setUser(meQuery.data);
      }
      if (meQuery.isError) {
        void tokenStorage.clearAll();
        setUser(null);
      }
    }
  }, [hydrated, hasToken, meQuery.data, meQuery.isError, meQuery.isFetched]);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch {
      // ignore logout network errors
    } finally {
      await tokenStorage.clearAll();
      setUser(null);
      setSessionEpoch((n) => n + 1);
      queryClient.clear();
    }
  }, [queryClient]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      void logout();
    });
    return () => setAuthFailureHandler(null);
  }, [logout]);

  const login = useCallback(
    async (payload: Omit<LoginPayload, 'deviceName'>) => {
      const deviceName = Device.modelName ?? Device.deviceName ?? 'mobile';
      const res = await loginRequest({ ...payload, deviceName });
      const data = res.data;
      if (!data) {
        throw new Error(res.message || 'Login failed');
      }
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      await tokenStorage.setUser(data.user);
      setUser(data.user);
      setSessionEpoch((n) => n + 1);
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    [queryClient],
  );

  const access = accessQuery.data ?? null;

  const hasPermission = useCallback(
    (permission: string) => {
      if (!access) return false;
      if (access.bypassPermissions) return true;
      return access.permissions.includes(permission);
    },
    [access],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      access,
      isAuthenticated: Boolean(user && tokenStorage.getAccessToken()),
      isBootstrapping:
        !hydrated || (hasToken && meQuery.isLoading && !user),
      login,
      logout,
      hasPermission,
    }),
    [
      user,
      access,
      hydrated,
      hasToken,
      meQuery.isLoading,
      login,
      logout,
      hasPermission,
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
