# Investor portal — staff manage UI

Manage endpoints are **staff-only** (not investor self-service):

| Guard | GET (view) | POST/PATCH (manage) |
|---|---|---|
| Scope | `@InvestorScoped` | `@ProjectScoped` |
| Permission | `investor_portal.view` | `investor_portal.manage` |

UI lives on existing **project-scoped staff pages**, not `/investor/*`:

- **Publish report** — `/projects/:projectId/documents` (`PublishInvestorReportPanel`)
- **Record profit / mark distributed** — `/projects/:projectId/participants` (`InvestorProfitAllocationPanel`)

No new routes were added. API clients: `manage/api.ts`.

Because the backend has no list GET for profit allocations, recently recorded rows are kept in `sessionStorage` for PATCH-by-id in the same browser session.
