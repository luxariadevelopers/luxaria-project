# Luxaria Testing Guide

Complete test setup across backend, web, and mobile.

## Stack

| Layer | Tooling |
|-------|---------|
| Backend unit / integration | Jest + `mongodb-memory-server` |
| Backend API / e2e | Jest + Supertest + `@nestjs/testing` |
| Backend transactions | Jest + `MongoMemoryReplSet` |
| Web e2e | Playwright |
| Mobile unit / component | Jest projects + `@testing-library/react-native` (RN mock host) |
| Mobile offline sync | Jest (node logic + integration) |

## Commands

### Root

```bash
pnpm test                 # all packages (default scripts)
pnpm test:unit            # backend unit + mobile unit
pnpm test:integration     # backend integration (transactions / balances)
pnpm test:api             # backend Supertest e2e
pnpm test:e2e             # web Playwright + backend e2e
pnpm test:ci              # CI matrix entrypoint
```

### Backend (`@luxaria/backend`)

```bash
pnpm --filter @luxaria/backend test              # unit (excludes *.integration.spec.ts)
pnpm --filter @luxaria/backend test:integration  # *.integration.spec.ts
pnpm --filter @luxaria/backend test:e2e          # test/**/*.e2e-spec.ts
pnpm --filter @luxaria/backend test:all          # unit + integration + e2e
pnpm --filter @luxaria/backend test:security     # security-focused suite
```

### Web (`@luxaria/web`)

```bash
pnpm --filter @luxaria/web test:e2e              # Playwright
pnpm --filter @luxaria/web test:e2e:ui           # Playwright UI mode
```

### Mobile (`@luxaria/mobile`)

```bash
pnpm --filter @luxaria/mobile test               # Jest (offline + RNTL components)
pnpm --filter @luxaria/mobile test:offline       # offline sync suites only
```

## Suite map

| Concern | Location |
|---------|----------|
| Unit | `apps/backend/src/**/*.spec.ts` |
| Integration / DB transactions | `**/*.integration.spec.ts` (replica set) |
| Accounting balance | `journal/accounting-balance.integration.spec.ts` |
| Idempotency | `database/services/idempotency.service.spec.ts` |
| Permissions | `rbac/guards/*.spec.ts` + `test/permissions.e2e-spec.ts` |
| Project access | `project-access/**/*.spec.ts` + `test/project-access.e2e-spec.ts` |
| Approvals | `approvals.service.spec.ts` + `test/approvals.e2e-spec.ts` |
| File upload | `common/security/file-upload.util.spec.ts` + `test/file-upload.e2e-spec.ts` |
| Offline sync | `apps/mobile/src/offline/__tests__/**` |
| Web e2e | `apps/web/e2e/**` |
| Mobile components | `apps/mobile/src/**/__tests__/**/*.tsx` |
| UI/API matrix coverage | `apps/backend/src/common/docs/ui-api-matrix.coverage.spec.ts` |
| Shared API envelope type tests | `packages/shared-types/type-tests/api-contracts.type-test.ts` |

## Helpers

- `apps/backend/test/helpers/create-api-app.ts` — Nest + ValidationPipe + Supertest harness
- `apps/backend/test/helpers/mongo-test.helper.ts` — memory Mongo / replica set

## CI

See [CI.md](./CI.md). Pull requests are gated by **PR Validation** (`.github/workflows/pr-validation.yml`):

1. Typecheck / lint
2. Unit tests (backend + mobile)
3. Integration tests
4. API / e2e tests
5. Build backend / build web
6. Security audit (+ `security.yml`)
7. Docker image builds

Require the **PR gate** status check in branch protection to block merges on failure.

## Conventions

1. Prefer colocated `*.spec.ts` next to the unit under test.
2. Use `*.integration.spec.ts` when a replica set / multi-doc transaction is required.
3. Put HTTP contract tests under `apps/backend/test/*.e2e-spec.ts`.
4. Do not hit real AWS / production Mongo from CI.
5. Keep Playwright smoke tests independent of seeded auth until a CI seed user exists.
