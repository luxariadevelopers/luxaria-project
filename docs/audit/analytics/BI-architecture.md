# Phase 9 – Director BI Architecture

**Date:** 2026-07-21  
**Principle:** Operational modules remain the system of record. Analytics is a trusted read-model / intelligence layer.

## Pipeline

```
Transactional Modules (Phases 1–8)
        ↓
Domain Events / Live Aggregation (dashboard services)
        ↓
Analytics Read Models (`/analytics/*`)
        ↓
Immutable Snapshot Collections
        ↓
Dashboards, Mobile Executive, Reports
```

## Modules

| Layer | Location | Role |
|-------|----------|------|
| Live ops dashboards | `director-command-centre`, `*-dashboard` | Source aggregations |
| Analytics façade | `apps/backend/src/modules/analytics` | KPI catalog, forecasts, alerts, drill-down, exports |
| Snapshots | `analytics_kpi_snapshots` | Immutable historical freeze |
| Alerts | `analytics_alerts` | Exception centre with ack |

## Cost formula baseline

```
Estimate at Completion
  = Actual Cost
  + Committed Unbilled Cost
  + Forecast Remaining Cost
```

Helpers: `analytics.calculation.ts` (pure, unit-tested).

## Cash-flow forecast horizons

`7` · `30` · `90` · `monthly` · `completion`

Drivers: customer schedule dues, contractor RA payables, vendor invoice dues, contribution commitments (payroll/statutory/loans reserved for enrichment).

## Drill-down

`GET /analytics/kpi-drilldown?kpi=receivables` returns an ordered path to source APIs  
(example: Receivables → Project → Customer → Booking → Demand → Receipt → Ledger).

## Permissions

`analytics.dashboard.view` · `analytics.company.view` · `analytics.project.view` ·  
`analytics.financial.view` · `analytics.sales.view` · `analytics.construction.view` ·  
`analytics.procurement.view` · `analytics.inventory.view` · `analytics.contractor.view` ·  
`analytics.forecast.view` · `analytics.export` · `analytics.snapshot.manage` · `analytics.alert.manage`

Seeded on `MANAGING_DIRECTOR`, `DIRECTOR`, `FINANCE_DIRECTOR` (+ Super Admin).

## Isolation

- Company boundary via primary company + project access service  
- Project assignment enforced on project-scoped endpoints  
- Director financial views gated by `analytics.financial.view` / `analytics.company.view`  
- Investor portal remains on its own restricted surface (not full BI)

## Performance

- Prefer façade over existing indexed dashboard aggregations (no unbounded scans)  
- Client staleTime 60s on analytics pages  
- Snapshot capture for historical dashboards (immutable)  
- Large reports return structured export jobs (CSV/Excel/PDF payload)

## Web routes

`/director-dashboard` · `/executive-summary` · `/project-health` · `/project-profitability` ·  
`/cash-flow-forecast` · `/cost-forecast` · `/sales-analytics` · `/construction-analytics` ·  
`/procurement-analytics` · `/inventory-analytics` · `/contractor-analytics` ·  
`/financial-analytics` · `/risk-alerts` · `/kpi-drilldown` · `/analytics-reports`

Legacy ops dashboards (`/dashboard/director`, domain dashboards) remain available.
