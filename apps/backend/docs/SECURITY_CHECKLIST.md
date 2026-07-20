# Luxaria Backend Security Checklist

Use this checklist for releases and security reviews. Items are implemented in `apps/backend` unless noted as infra.

## Transport & HTTP

- [x] **Helmet / security headers** — `main.ts` (`helmet`, HSTS in production, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`)
- [x] **CORS allowlist** — `CORS_ORIGINS` CSV; production requires non-empty list; `*` rejected; credentials enabled
- [x] **Request ID** — `RequestIdMiddleware` sets/propagates `X-Request-Id`
- [x] **Rate limiting** — global `ThrottlerGuard` (100/min); auth routes tighter (login 5/min, refresh 10/min, bootstrap 3/min)

## Authentication & sessions

- [x] **JWT expiry** — access token `JWT_ACCESS_EXPIRES_IN` (default `15m`); `ignoreExpiration: false`
- [x] **Refresh-token rotation** — opaque hashed tokens; rotate on refresh; reuse revokes token family
- [x] **Secure cookies** — httpOnly refresh cookie `luxaria_refresh_token` (`Secure` in prod, `SameSite`, path `/api/v1/auth`); body token still accepted for mobile
- [x] **Account lock** — failed login counter + `lockUntil`; JWT/login reject while locked
- [x] **Auth audit** — login success/failure, refresh reuse, logout-all recorded via `AuditLogService`

## Authorization

- [x] **Permission checks** — global `PermissionsGuard` + `@RequirePermissions`
- [x] **Project-access checks** — global `ProjectAccessGuard` + `@RequireProjectAccess` on project-scoped routes (extend coverage when adding new project APIs)
- [ ] **Controller coverage lint** — CI rule that authenticated handlers declare permissions (recommended follow-up)

## Input & injection

- [x] **Input validation** — global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
- [x] **NoSQL injection protection** — `MongoSanitizeMiddleware` strips `$` / `__proto__` keys from body/query/params
- [x] **XSS protection** — helmet headers + `XssSanitizeMiddleware` strips script/iframe/`javascript:` payloads from JSON bodies; SVG logos disallowed

## Files & storage

- [x] **File validation** — shared `createSecureMulterOptions` (size + MIME + extension); company logos use magic-byte checks; bank statement imports allowlisted
- [x] **S3 private access** — presigned PUT/GET only; no public-read ACL; bucket name required; infra must enable Block Public Access
- [x] **Encryption for bank details** — AES-256-GCM field encryption (`FIELD_ENCRYPTION_KEY`) for bank account numbers

## Secrets & supply chain

- [x] **Secrets via environment** — `ConfigModule` + `env.validation.ts`; production rejects missing/default JWT & encryption secrets
- [x] **Dependency scanning** — `pnpm audit` script + GitHub Action / Dependabot
- [x] **`.env.example`** — documents required variables (no real secrets)

## Observability

- [x] **Audit logging** — insert-only audit module with sensitive-field masking
- [x] **Security tests** — `common/security/*.spec.ts`, auth lock/refresh specs, env production validation

## Ops / infra (outside app code)

- [ ] TLS termination with modern ciphers
- [ ] S3 Block Public Access + bucket policy deny `s3:PutObjectAcl`
- [ ] Secrets manager / KMS for production keys
- [ ] WAF / edge rate limits for public auth endpoints
- [ ] Regular penetration test / external audit

## Quick verification

```bash
pnpm --filter @luxaria/backend test -- src/common/security src/modules/auth --runInBand
pnpm audit --prod
```
