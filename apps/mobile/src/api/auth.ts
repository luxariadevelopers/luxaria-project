import { apiGet, apiPost } from './client';
import type { AuthUser, LoginResponse, UserAccess } from './types';

export type LoginPayload = {
  identifier: string;
  password: string;
  deviceName?: string;
};

export async function loginRequest(payload: LoginPayload) {
  return apiPost<LoginResponse>('/auth/login', payload);
}

export async function logoutRequest(refreshToken: string) {
  return apiPost<null>('/auth/logout', { refreshToken });
}

export async function fetchCurrentUser() {
  return apiGet<AuthUser>('/auth/me');
}

export async function fetchMyPermissions() {
  return apiGet<UserAccess>('/rbac/me/permissions');
}
