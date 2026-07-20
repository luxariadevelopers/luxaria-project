# Micro Phase 106 — Booking cancellations & refunds (web)

**Status:** Complete in isolated worktree `phase106-66294e8e`  
**Branch:** `phase/106-booking-cancellations-wt`  
**WORKTREE_PATH:** `~/.cursor/worktrees/phase106-66294e8e/luxaria project-fa80d8f4bb3b`

## Delivered

- Route `/sales/cancellations` with `RegistryRouteGuard` (`cancellations`, `booking.view`, `projectScope: required`)
- Nav: **Sales → Cancellations & Refunds**
- Module `apps/web/src/booking-cancellations/`:
  - Nest client for request / review / submit-approval / approve / reject / process-refund / release-unit
  - `CancellationForm`, refund breakdown (received − charge − deductions), workflow timeline
  - Action gating: unit release only after approved workflow; refund only when `approved`
- Page `apps/web/src/pages/CancellationsPage.tsx` — loading / empty / error / 403 / retry
- Unit tests: refund amounts + unit-release gates + permission mapping + action gating (15 passing)
- `docs/ui-api-matrix.md` updated

## Nest permissions (catalog — not prompt aliases)

| Capability | Nest code |
|---|---|
| View / list / detail | `booking.view` |
| Request, review, submit approval, release unit, documents | `booking.cancel` |
| Approve / reject | `booking.approve` |
| Process refund (posts journal) | `collection.refund` |
| Bank selector | `bank.view` |

Prompt aliases `booking_cancel.view/request/approve/refund` are **not** in Nest; UI uses the codes above.

## Acceptance

- **No double availability:** `release_unit` UI/API only after `approved` (zero refund) or `refund_processed` (refund due)
- **No unapproved refunds:** `process_refund` only when status is `approved` and `approvedRefund > 0`

## Merge notes (`/apply-worktree`)

### 1. Take these paths from the worktree

- `apps/web/src/booking-cancellations/**`
- `apps/web/src/pages/CancellationsPage.tsx`
- `docs/ui-api-matrix.md` (phase 106 section)
- `COMPLETION_106.md` (optional)

### 2. `apps/web/src/navigation/routeRegistry.ts`

Add (do **not** replace the full main registry):

```ts
{
  id: 'cancellations',
  path: '/sales/cancellations',
  title: 'Cancellations & Refunds',
  layout: 'app',
  showInNav: true,
  groupId: 'sales',
  icon: 'sales',
  anyOf: ['booking.view'],
  projectScope: 'required',
  breadcrumbSegment: 'cancellations',
},
```

Place after the `bookings` entry. `AppRouteId` is inferred from `APP_ROUTES`.

### 3. `apps/web/src/routes/index.tsx`

Inside `<Route element={<AppLayout />}>`, near other Sales routes:

```tsx
<Route element={<RegistryRouteGuard routeId="cancellations" />}>
  <Route
    path={toRelativeAppPath('/sales/cancellations')}
    element={<CancellationsPage />}
  />
</Route>
```

Import `CancellationsPage` from `@/pages/CancellationsPage`.  
Prefer main’s full router; do not keep this worktree’s slim `routes/index.tsx`.

### 4. Prefer main infrastructure

Keep main copies of layouts, navigation shell, `workflow-timeline`, `components/*`, etc. Merge only the cancellations module + registry/route wiring above.

## Verify after merge

```bash
pnpm --filter @luxaria/web typecheck
pnpm --filter @luxaria/web exec vitest run src/booking-cancellations
pnpm --filter @luxaria/web exec eslint "src/booking-cancellations/**/*.{ts,tsx}" "src/pages/CancellationsPage.tsx"
```

## Worktree metadata

```text
WORKTREE_ID=phase106-66294e8e
REPO_ROOT=/Users/goldjeniston/Desktop/LUXARIA DEVELOPERS/luxaria project
WORKTREE_PATH=/Users/goldjeniston/.cursor/worktrees/phase106-66294e8e/luxaria project-fa80d8f4bb3b
HEAD_COMMIT=525bd905ebcedd2400ac9933fff3be5c692031a4
WORKTREE_START_REF=HEAD
```

Setup: skipped after checking both `REPO_ROOT` and `WORKTREE_PATH` for `.cursor/worktrees.json` (none).

Merge-back: `/apply-worktree` · Cleanup: `/delete-worktree`
