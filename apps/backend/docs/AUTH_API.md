# Authentication API — Luxaria Developers ERP

Base path: `/api/v1/auth`  
Swagger: `http://localhost:9000/api/docs` (Auth tag)

All success responses use the standard envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": {}
}
```

## Security model

- Passwords hashed with **Argon2id** (never stored plain)
- Refresh tokens stored as **SHA-256 hashes**
- Refresh **rotation**: old token revoked, new token issued in the same family
- Reuse of a revoked refresh token revokes the **entire family**
- Login / forgot / reset are **rate-limited** (5 req / minute)
- Failed logins lock the account after configurable attempts (default 5 / 30 minutes)
- Inactive users cannot authenticate
- Device session fields: `ipAddress`, `userAgent`, `deviceName`, `lastUsedAt`

## Environment

```bash
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
AUTH_MAX_FAILED_ATTEMPTS=5
AUTH_LOCK_MINUTES=30
```

## Endpoints

### `POST /auth/bootstrap-admin` (public)

Create the **first** admin user when `users` is empty.

```json
{
  "fullName": "Managing Director",
  "email": "admin@luxaria.dev",
  "mobile": "9876543210",
  "password": "ChangeMe123!"
}
```

### `POST /auth/login` (public, throttled)

Login with **email or mobile** + password.

```json
{
  "identifier": "admin@luxaria.dev",
  "password": "ChangeMe123!",
  "deviceName": "MacBook Pro"
}
```

Returns `accessToken`, `refreshToken`, `user`.

### `POST /auth/refresh` (public, throttled)

```json
{ "refreshToken": "..." }
```

Returns new access + refresh tokens (previous refresh revoked).

### `POST /auth/logout` (public)

```json
{ "refreshToken": "..." }
```

Revokes that device session.

### `POST /auth/logout-all` (Bearer access token)

Revokes all refresh sessions for the current user.

### `POST /auth/forgot-password` (public, throttled)

```json
{ "identifier": "admin@luxaria.dev" }
```

Always returns a generic success message.  
In non-production, `meta.resetToken` is included for local testing (email/SMS later).

### `POST /auth/reset-password` (public, throttled)

```json
{
  "token": "...",
  "newPassword": "NewPass123!"
}
```

Revokes all sessions after reset.

### `GET /auth/me` (Bearer access token)

Returns the authenticated user profile.

## Authenticated routes

`JwtAuthGuard` is global. Mark public routes with `@Public()`.  
Send: `Authorization: Bearer <accessToken>`.
