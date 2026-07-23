import { type ApiError, type ApiResponse } from '@luxaria/shared-types';
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { tokenStorage } from '@/auth/tokenStorage';
import type { RefreshResponse } from './types';

export {
  getErrorMessage,
  isConflictError,
  isForbiddenError,
  isRetryableError,
  isUnauthorizedError,
  toAppError,
} from './errors';


const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const { data } = await axios.post<ApiResponse<RefreshResponse>>(
      `${baseURL}/auth/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        // Keep httpOnly refresh cookie in sync with localStorage rotation.
        withCredentials: true,
      },
    );
    const tokens = data.data;
    if (!tokens?.accessToken || !tokens.refreshToken) {
      return null;
    }
    tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    tokenStorage.clearAll();
    return null;
  }
}

function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  accessToken: string,
) {
  const value = `Bearer ${accessToken}`;
  const headers = config.headers;
  if (headers && typeof headers.set === 'function') {
    headers.set('Authorization', value);
    return;
  }
  config.headers = { ...headers, Authorization: value } as typeof config.headers;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    setAuthorizationHeader(config, token);
  }
  const url = config.url ?? '';
  // Investor portal is path-scoped; do not send staff active-project header.
  if (!url.includes('/investor-portal')) {
    const projectId = tokenStorage.getSelectedProjectId();
    if (projectId) {
      const headers = config.headers;
      if (headers && typeof headers.set === 'function') {
        headers.set('X-Project-Id', projectId);
      } else {
        config.headers = {
          ...headers,
          'X-Project-Id': projectId,
        } as typeof config.headers;
      }
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const requestUrl = original?.url ?? '';

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/refresh')
    ) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        setAuthorizationHeader(original, newToken);
        return apiClient(original);
      }
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/investor')) {
          window.location.assign('/investor/login');
        } else if (!path.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    }

    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string, params?: Record<string, unknown>) {

  const { data } = await apiClient.get<ApiResponse<T>>(url, { params });
  return data;
}

export async function apiPost<T>(url: string, body?: unknown) {
  const { data } = await apiClient.post<ApiResponse<T>>(url, body);
  return data;
}

export async function apiPatch<T>(url: string, body?: unknown) {
  const { data } = await apiClient.patch<ApiResponse<T>>(url, body);
  return data;
}

export async function apiPut<T>(url: string, body?: unknown) {
  const { data } = await apiClient.put<ApiResponse<T>>(url, body);
  return data;
}

export async function apiDelete<T>(url: string) {
  const { data } = await apiClient.delete<ApiResponse<T>>(url);
  return data;
}
