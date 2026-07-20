# Project cost forecast (Micro Phase 086)

Route: `/project-control/cost-forecast`

Nav (worktree shell): **Project Control → Cost Forecast**  
Nav (full registry merge): see `COMPLETION_086.md`.

## APIs (existing — no invented project_cost module)

| Endpoint | Permission | Use |
|---|---|---|
| `GET /accounting-reports/project-cost-sheet` | `report.view` | Category table + API total cost + `meta.generatedAt` |
| `GET /accounting-reports/project-cost-sheet/export` | `report.export` | Excel export button |
| `GET /projects/:projectId/dashboard` | `dashboard.view` | Budget, actual, commitments, forecast-to-complete, projected final |

Brief alias **`project_cost.view` is not in the RBAC catalog** — route guard uses **`report.view` + `dashboard.view`** (`allOf` in registry merge).

Optional drill-down source (not loaded by default): `GET /construction-reports/boq-budget-vs-actual` (`report.view`) — documented for future BOQ variance panel.

## UX rules

- Display **`totals.cost`** and dashboard tile amounts exactly as returned by the API.
- Show calculation timestamp from **`meta.generatedAt`** on the cost sheet (never client-computed).
- Category table groups rows for readability; footer total always uses API `totals.cost`.

## Tests

`deriveCostForecast.test.ts`, `api.test.ts`, `drillDownLinks.test.ts`
