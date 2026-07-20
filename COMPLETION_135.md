# Micro Phase 135 — Email notification provider

## Objective

Wire production email notification provider, replacing the email channel stub.

## Completed

- [x] **SMTP provider adapter** — `EmailSmtpProvider` (nodemailer) driven by `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, optional `SMTP_SECURE`.
- [x] **Stub mode** — when `SMTP_HOST` or `EMAIL_FROM` unset, channel logs stub deliveries (local/dev unchanged behaviour).
- [x] **Email channel** — recipient lookup from `users.email`, validation (active user, valid address), empty template guard; wired into existing dispatcher retry + delivery log pipeline.
- [x] **Suppression** — channel preferences / muted handled by dispatcher (unchanged); user inactive/locked/missing email skipped in SMTP mode.
- [x] **Config** — `AppConfig` + `apps/backend/.env.example` updated.
- [x] **Permissions** — no new permission; operational visibility via existing `notification.manage` delivery-logs/templates APIs.
- [x] **Tests** — unit specs (`email.channel.spec.ts`, `email-recipient.util.spec.ts`); integration spec stub provider (`email.channel.integration.spec.ts`).
- [x] **Docs** — `apps/backend/docs/NOTIFICATIONS_API.md`.

## Not in scope

- Web Settings > Notification Providers UI (settings page is placeholder-only).
- `notification_provider.manage` permission (does not exist in RBAC).

## Verify

```bash
pnpm --filter @luxaria/backend test:unit -- email
pnpm --filter @luxaria/backend test:integration -- email.channel.integration
pnpm --filter @luxaria/backend typecheck
```

## Production enable

Set SMTP env vars on the backend deployment, then send a test notification with `channels: ["email"]` and confirm `GET /notifications/delivery-logs?channel=email` shows `status: sent` and `meta.provider: smtp`.
