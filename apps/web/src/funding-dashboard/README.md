# Funding dashboard (Micro Phase 040)

Route: `/capital/funding-dashboard`

## APIs (existing — no dedicated funding-dashboard module)

| Endpoint | Permission | Use |
|---|---|---|
| `GET /projects/:projectId/commitments/summary` | `contribution_commitment.view` | Committed / received / pending cards |
| `GET /projects/:projectId/commitments?status=approved` | `contribution_commitment.view` | Participant chart aggregation |
| `GET /projects/:projectId/participants` (active) | `project_participant.view` | Chart labels |
| `GET /projects/:projectId/contribution-receipts/balances` | `contribution_receipt.view` | Optional posted-receipt banner |
| `GET /accounting-reports/source-and-utilisation-of-funds` | `report.view` | Utilisation by source table |

Route guard uses **`dashboard.view`** (RBAC has no `funding.dashboard.view`). Section queries still require the module permissions above; 403s surface as permission-denied panels.

## Filters

**Project** and **as-of date** are required before queries run. Utilisation `from` = calendar-year start of the as-of date (`periodFromForDate`). Project selection syncs the header project context.
