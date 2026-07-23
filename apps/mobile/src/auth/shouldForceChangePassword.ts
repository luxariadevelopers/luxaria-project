import type { AuthUser } from '@/api/types';

/** Whether the authenticated session must stay on the force-change-password gate. */
export function shouldForceChangePassword(
  isAuthenticated: boolean,
  user: Pick<AuthUser, 'mustChangePassword'> | null | undefined,
): boolean {
  return isAuthenticated && Boolean(user?.mustChangePassword);
}
