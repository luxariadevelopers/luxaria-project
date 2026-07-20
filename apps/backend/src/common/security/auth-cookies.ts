import type { CookieOptions, Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from './security.constants';

export type AuthCookieConfig = {
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAgeMs: number;
  domain?: string | null;
};

export function refreshCookieOptions(config: AuthCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    maxAge: config.maxAgeMs,
    path: '/api/v1/auth',
    ...(config.domain ? { domain: config.domain } : {}),
  };
}

export function setRefreshTokenCookie(
  res: Response,
  refreshToken: string,
  config: AuthCookieConfig,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions(config));
}

export function clearRefreshTokenCookie(
  res: Response,
  config: Pick<AuthCookieConfig, 'secure' | 'sameSite' | 'domain'>,
): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: config.secure,
    sameSite: config.sameSite,
    path: '/api/v1/auth',
    ...(config.domain ? { domain: config.domain } : {}),
  });
}

export function readRefreshTokenFromRequest(input: {
  bodyToken?: string | null;
  cookieToken?: string | null;
}): string | null {
  const fromBody = input.bodyToken?.trim();
  if (fromBody) return fromBody;
  const fromCookie = input.cookieToken?.trim();
  if (fromCookie) return fromCookie;
  return null;
}
