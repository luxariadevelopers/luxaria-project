# Notifications API — Luxaria Developers ERP

Base path: `/api/v1/notifications`  
Swagger: `http://localhost:9000/api/docs` (Notifications tag)

## Permissions

| Permission | Use |
| --- | --- |
| `notification.view` | Inbox, read state, preferences |
| `notification.send` | Send / schedule now |
| `notification.manage` | Templates, delivery logs, scheduled jobs, provider status |

There is **no** `notification_provider.manage` permission — provider configuration is env-driven; operational status is observed via delivery logs and templates under `notification.manage`.

## Email provider (Micro Phase 135)

Outbound email uses **nodemailer** over SMTP when configured. When `SMTP_HOST` and `EMAIL_FROM` are unset, the email channel runs in **stub mode** (logs only — suitable for local/dev).

### Environment

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=Luxaria ERP <noreply@example.com>
```

**AWS SES (SMTP):** use the regional SMTP endpoint (e.g. `email-smtp.ap-south-1.amazonaws.com`) with IAM SMTP credentials in `SMTP_USER` / `SMTP_PASS`.

### Delivery rules

1. **Preferences / suppression** — dispatcher resolves channels per user (`muted`, event disabled, channel disabled). Disabled email → delivery log status `skipped`.
2. **Recipient validation** (SMTP mode only) — active user with a valid `users.email`; inactive/locked users or missing email → `skipped`.
3. **Template variables** — subject/body rendered in dispatcher via `{{variable}}` interpolation; empty subject or body after render → `skipped`.
4. **Retry** — BullMQ retries (when Redis enabled) or manual retry via `POST /notifications/delivery-logs/:id/retry` (`notification.manage`).

### Stub vs SMTP

| Mode | When | Delivery log `meta.provider` |
| --- | --- | --- |
| Stub | `SMTP_HOST` or `EMAIL_FROM` missing | `stub` |
| SMTP | Both set | `smtp` |

## Endpoints (summary)

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/notifications` | `notification.view` |
| `PATCH` | `/notifications/:id/read` | `notification.view` |
| `POST` | `/notifications/read-all` | `notification.view` |
| `GET` / `PUT` | `/notifications/preferences` | `notification.view` |
| `POST` | `/notifications/send` | `notification.send` |
| `POST` | `/notifications/schedule` | `notification.send` |
| `GET` | `/notifications/scheduled` | `notification.manage` |
| `POST` | `/notifications/scheduled/process` | `notification.manage` |
| `GET` / `PUT` | `/notifications/templates` | `notification.manage` |
| `GET` | `/notifications/delivery-logs` | `notification.manage` |
| `POST` | `/notifications/delivery-logs/:id/retry` | `notification.manage` |

Filter delivery logs by `channel=email` to audit email provider activity.

## Testing

```bash
pnpm --filter @luxaria/backend test:unit -- email
pnpm --filter @luxaria/backend test:integration -- email.channel.integration
```
