import {
  readRefreshTokenFromRequest,
  refreshCookieOptions,
} from './auth-cookies';

describe('auth cookies', () => {
  it('builds httpOnly secure cookie options', () => {
    const options = refreshCookieOptions({
      secure: true,
      sameSite: 'strict',
      maxAgeMs: 7 * 86_400_000,
      domain: '.luxaria.test',
    });

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('strict');
    expect(options.path).toBe('/api/v1/auth');
    expect(options.domain).toBe('.luxaria.test');
  });

  it('prefers body refresh token over cookie', () => {
    expect(
      readRefreshTokenFromRequest({
        bodyToken: 'body-token',
        cookieToken: 'cookie-token',
      }),
    ).toBe('body-token');
    expect(
      readRefreshTokenFromRequest({
        bodyToken: null,
        cookieToken: 'cookie-token',
      }),
    ).toBe('cookie-token');
  });
});
