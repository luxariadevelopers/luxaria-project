# Permission-aware navigation registry (Micro Phase 012)

Single source of truth for web routes: path, title, icon, permissions, and project scope.

## Source of permissions

Runtime grants: `GET /api/v1/rbac/me/permissions` (via `AuthContext` / `fetchMyPermissions`).

Catalog typing: `permissionCatalog.ts` mirrors `apps/backend/src/modules/rbac/permissions.catalog.ts` as a **strict** `PermissionCode` union so invalid keys fail typecheck.

## Files

| File | Role |
|---|---|
| `routeRegistry.ts` | `APP_ROUTE_REGISTRY`, groups, titles, duplicate-path check |
| `routeAccess.ts` | `evaluateRouteAccess` / `canEnterRoute` / `isNavItemVisible` |
| `filterNav.ts` | Sidebar visibility from registry + access |
| `permissionCatalog.ts` | Typed permission codes |
| `../auth/RegistryRouteGuard.tsx` | URL guard using registry metadata |

## Rules

1. Add every new portal route to `APP_ROUTE_REGISTRY` first.
2. Wire the page element in `routes/index.tsx` with `RegistryRouteGuard routeId="…"`.
3. Navigation and guards must both call `evaluateRouteAccess` (do not hard-code permissions in the router).
4. `projectScope: 'required'` also mounts `ProjectRequiredRoute` (hiding a menu item is not enough).

## Approvals nav (Phase 027)

Group **Approvals** → item **Pending** (`/approvals`, `approval.view`,
`projectScope: required`).

## Documents nav (Phase 029)

Group **Administration** → item **Documents** (`/documents`, `document.view`).

## Audit logs nav (Phase 030)

Group **Administration** → item **Audit Logs** (`/administration/audit-logs`,
`audit.view`).

## Shareholding nav (Phase 032)

Group **Capital & Investment** → item **Shareholding** (`/capital/shareholding`,
`shareholding.view`, `projectScope: none`). Approve/reject use
`shareholding.approve` (there is no `shareholding.change` code).

## Investor detail (Phase 034)

Deep link `/capital/investors/:investorId` (`investor-detail`, `investor.view`,
`showInNav: false`). List remains Capital & Investment → Investors.

## Customers nav (Phases 099–100)

Group **Sales** → item **Customers** (`/sales/customers`, `customer.view`,
`projectScope: none`). Create/update/KYC/activate map to Nest `customer.manage`
(prompt aliases `customer.create` / `customer.update` /
`customer.view_sensitive`). Deep link `/sales/customers/:customerId`
(`customer-detail`, `customer.view`, `showInNav: false`). Coordinates with
Units at `/sales/units` under the same Sales group.

## Commitments nav (Phases 037–038)

Group **Capital & Investment** → item **Commitments** (`/capital/commitments`,
`contribution_commitment.view`, `projectScope: required`). Catalog has no
`commitment.*` aliases.

Deep link `/capital/commitments/:commitmentId` (`commitment-detail`, same
permission + project scope, `showInNav: false`).

## Contribution receipts nav (Phase 039)

Group **Capital & Investment** → item **Contribution Receipts**
(`/capital/contribution-receipts`, `contribution_receipt.view`,
`projectScope: required`).

## Chart of accounts nav (Phases 041–042)

Group **Accounting** → item **Chart of Accounts**
(`/accounting/chart-of-accounts`, `account.view`, `projectScope: none`).
Create/edit: `/new` (`account.manage`) and `/:accountId/edit` (`account.view`
to open; save needs `account.manage`). Catalog has no `account.create` /
`account.update`.

## Journals nav (Phases 043–045)

Group **Accounting** → item **Journals** (`/accounting/journals`,
`journal.view`, `projectScope: none`). List filters: FY, project, source,
status, date range (Nest has no free-text `search`).

**New Journal** (`/accounting/journals/new`, `journal.create`, showInNav) —
manual draft create + submit (Phase 044). Catalog has no `journal.submit`;
submit uses `journal.create`.

Deep link `/accounting/journals/:journalId` (`journal-detail`,
`journal.view`, `showInNav: false`) for post / reverse / cancel. Cancel uses
`journal.create` (catalog has no `journal.cancel`).

## Bank accounts nav (Phase 046)

Group **Accounting** → item **Bank Accounts**
(`/accounting/bank-accounts`, `bank.view`, `projectScope: none`).
Detail: `/:bankAccountId` (`bank.view`, `showInNav: false`). Catalog uses
`bank.view|manage|view_sensitive` — not `bank_account.*`.

## Cash accounts nav (Phase 047)

Group **Accounting** → item **Cash & Petty Cash**
(`/accounting/cash-accounts`, `cash.view`, `projectScope: required`).
Catalog uses `cash.view|manage` — not `cash_account.*`.

## Petty Cash fund requests nav (Phases 048–049)

Group **Petty Cash** → item **Fund Requests**
(`/accounting/petty-cash/requests`, `petty_cash.view`,
`projectScope: required`). Create: `/new` (`petty_cash.request`); detail:
`/:requestId` (`petty_cash.view`). Nest permissions are
`petty_cash.view|request|approve|fund` — not `petty_cash_request.*`.

## Petty Cash fund transfers nav (Phase 050)

Group **Petty Cash** → item **Fund Transfers**
(`/accounting/petty-cash/transfers`, `petty_cash.view`,
`projectScope: required`). Create/verify/post/cancel use `petty_cash.fund`
— not `petty_cash_transfer.*`.

## Goods Receipts nav (Phase 068)

Group **Inventory** → item **Goods Receipts** (`/inventory/grns`,
`grn.create`, `projectScope: required`). Detail: `/:grnId` (`grn.create`,
`showInNav: false`). QC / accept / post use Nest `grn.approve` (catalog has
no `grn.view` / `grn.qc` / `grn.accept` / `grn.post`).

## Quality Inspections nav (Phase 069)

Group **Inventory** → item **Quality Inspections**
(`/inventory/quality-inspections`, `quality.view`, `projectScope: required`).
Detail: `/:inspectionId` (`quality.view`, `showInNav: false`). Create /
update / complete / cancel use Nest `quality.inspect` (catalog has no
`quality_inspection.view|create|approve`).

## Contractor payments nav (Phase 096)

Group **Contractors** → item **Payments** (`/contractors/payments`,
`payment.view`, `projectScope: required`). Create/update/submit/release/cancel
use Nest `payment.release`; approve/verify/post use `payment.approve` (catalog
has no `contractor_payment.*`).

## Running bills nav (Phases 093–095)

Group **Contractors** → item **Running Bills** (`/contractors/running-bills`,
`running_bill.view`, `projectScope: required`).

| Route id | Path | Nav | Permission |
|----------|------|-----|------------|
| `running-bills` | `/contractors/running-bills` | yes | `running_bill.view` |
| `running-bill-create` | `/contractors/running-bills/new` | no | `running_bill.create` |
| `running-bill-detail` | `/contractors/running-bills/:id` | no | `running_bill.view` |

Submit-claim uses Nest `running_bill.create` (no `running_bill.submit` code).
Workflow: verify → certify → finance_verify → approve.

## Tests

- `filterNav.test.ts` — representative roles (site engineer, user admin, super admin)
- `routeRegistry.type-test.ts` — invalid permission keys (`@ts-expect-error`)
