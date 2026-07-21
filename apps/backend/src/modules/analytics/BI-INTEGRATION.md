# Analytics / Director BI — Integration Notes

## Consumers

- Web: `/director-dashboard`, `/executive-summary`, domain analytics routes  
- Mobile: `ExecutiveDashboard` → `GET /analytics/mobile/executive`  
- Digest: may consume weekly_director_summary snapshots

## Producers (source of truth)

Transactional modules remain authoritative. Analytics **reads** via:

- `DirectorCommandCentreService`
- `ProjectDashboardService`
- `FinanceDashboardService`
- Domain dashboards (sales, contractor, inventory, procurement, site-execution)

## Snapshots

`POST /analytics/snapshots` freezes a payload for kind ∈  
`daily_project_kpi` | `weekly_director_summary` | `monthly_financial_close` |  
`budget_version` | `forecast_version` | `cash_flow_forecast` | `project_progress`

Mutation endpoints reject changes (`immutable: true`).

## Formula

See `analytics.calculation.ts` — EAC / cash-flow bucket / margin helpers.
