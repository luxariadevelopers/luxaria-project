# GitHub Actions CI/CD

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| **PR Validation** | `.github/workflows/pr-validation.yml` | Typecheck, lint, unit/integration/API tests, backend/web builds, **Playwright E2E**, security audit, Docker builds |
| **Security** | `.github/workflows/security.yml` | Prod dependency audit + security Jest (also weekly) |
| **Docker** | `.github/workflows/docker.yml` | Image builds on `main`/`develop` + manual |
| **Deploy** | `.github/workflows/deploy.yml` | Environment-specific deploy **placeholder** |

Shared setup: `.github/actions/setup-pnpm` (pnpm 9.15.9, Node 20, `cache: pnpm`, frozen lockfile, shared package builds).

## Prevent merge when checks fail

1. Repo → **Settings** → **Branches** → branch protection for `main` (and `develop` if used).
2. Enable **Require status checks to pass before merging**.
3. Require the check named **`PR gate`** (job from PR Validation).
4. Optionally require **Dependency audit** / **Backend security tests** from the Security workflow.

`PR gate` fails if any of typecheck, lint, unit, integration, api, build-backend, build-web, **playwright-e2e**, security-audit, or docker-build did not succeed.

## Caching

- Node/pnpm store: `actions/setup-node` with `cache: pnpm`
- Docker layers: Buildx `cache-from` / `cache-to` type `gha`

## Secrets

- Never commit `.env`, tokens, or private keys.
- Deploy secrets live only in GitHub **Environments** (`staging`, `production`).
- Workflows reference `${{ secrets.* }}` / `${{ vars.* }}` and only log **presence** flags, never values.
- Docker/deploy workflows do not push images or call hosts until you wire them.

Suggested environment secrets/vars (create in UI, do not put in YAML):

| Name | Type | Use |
|------|------|-----|
| `DEPLOY_URL` | secret | Deploy hook / API base |
| `DEPLOY_TOKEN` | secret | Auth for deploy API |
| `APP_URL` | variable | Public app URL (safe to show) |

## Environment-specific deployment

1. Create GitHub Environments: **staging**, **production**.
2. Add secrets/vars per environment.
3. On **production**, enable required reviewers.
4. Run **Actions → Deploy → Run workflow**, choose `staging` or `production`.
5. Replace the placeholder step in `deploy.yml` with your provider (SSH, ECS, K8s, etc.). Prefer OIDC over long-lived tokens.

## Local equivalents

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm --filter @luxaria/backend build
pnpm --filter @luxaria/web build
pnpm audit --prod --audit-level=high
docker build -f apps/backend/Dockerfile.dev -t luxaria-backend-dev:local .
docker build -f apps/web/Dockerfile -t luxaria-web:local .
```
