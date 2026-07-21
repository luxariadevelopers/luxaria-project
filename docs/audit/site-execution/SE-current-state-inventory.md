# Phase 5 – Site Execution Current State Inventory

**Date:** 2026-07-21  
**Baseline:** post–Phase 4 inventory (`INV-completion-report.md`)  
**Principle (target):** DPR is the central daily transaction that drives inventory consumption, labour, equipment, measurements, progress, diary, quality/safety, and dashboards — not a standalone remarks form.

## Existing modules (keep / extend)

| Capability | Module | Status |
|------------|--------|--------|
| Daily Progress Report | `daily-progress-reports` | Strong form + PDF + missing alerts + mobile offline; **project+date only** (no `siteId` / zone / shift); materials are narrative lines not ledger-linked; equipment is free-text; workflow `draft → submitted → reviewed (+ reopened)` — missing Verified / Approved / Locked |
| Work measurements | `work-measurements` | BOQ qty + certify path; drawing is text ref only |
| Labour attendance | `labour-attendance` | Check-in style attendance + confirm; project-scoped |
| Labour categories | `labour-categories` | Rates + seed; skilled/unskilled counts on DPR |
| Manpower planning | `manpower-planning` | Plans + shortfall |
| Material issues / returns | `material-issues` | Confirm → stock ledger; optional `issueSiteId`; **not auto-driven by DPR** |
| Stock ledger / reservations | `stock-ledger`, `stock-reservations` | Immutable ledger; `sourceType: dpr` already on reservations |
| Material consumption reports | `material-consumption*` | BOQ variance; separate from DPR engine |
| Quality inspections | `quality-inspections` | **GRN / vendor QC only** — not site workmanship / NCR / punch |
| Sites / structure | `sites` | Project → site → phase/block/tower/floor; warehouse kinds; site assignments |
| Site ops dashboard | `project-dashboard` (site ops) | Aggregates DPR / labour / stock / cash / photos |
| Construction reports | `construction-reports` | DPR summary, labour, stock, delays |
| Documents / photos | `documents` | Generic S3; DPR/WM attach by `documentId`; no geo/versioned site gallery |
| Project setting | `projects` settings | `equipmentEnabled` stub (default false) — **no equipment module** |
| Web | `/project-control/dpr`, measurements, attendance, `/dashboard/site`, `/inventory/*` | Exists |
| Mobile | DPR, WM, attendance, material issue/return, barcode, site context | Offline enqueue present |

## Explicitly absent (first-class modules)

1. Site diary (meetings, instructions, risks as own entity)  
2. Equipment master / allocation / fuel / maintenance / breakdown / utilization  
3. Site quality (inspection → NCR → punch → rectification → re-inspection)  
4. HSE / safety (near miss, accident, PPE, toolbox talk, safety inspection)  
5. Drawing register (revision, supersede, site access, markup)  
6. Site issues tracker (delay, shortage, failure, design clarification) with Open → Assigned → Resolved → Closed  
7. Geo-tagged / versioned photo management linked across DPR / work / issue / quality / safety  
8. True site-scoped + location-scoped DPR (zone / block / tower / floor / unit / shift)  
9. DPR-driven automatic material consumption → ledger → project cost  
10. Director / PM site-execution dashboards beyond current site ops strip  
11. Full SE report suite as first-class product surface  

## Gaps vs Phase 5 scope

### DPR as operational engine

1. Scope keys: `siteId`, zone/block/tower/floor/unit, `shift`  
2. Uniqueness: from `projectId + reportDate` → site/shift-aware uniqueness  
3. Workflow: Draft → Submitted → Verified → Approved → Locked (map/extend current Reviewed/Reopened)  
4. Sections as **linked transactions**, not only embedded text: work completed/planned/delayed, labour deployment refs, equipment utilization refs, material issue IDs, weather, safety, quality, visitors, photos, drawings, issues, remarks  
5. On Approved/Locked: post inventory consumption (via material-issues / ledger), roll up progress %, feed cost & future contractor billing hooks  

### Labour

6. Labour contractors as first-class link on deployment  
7. Categories: Skilled / Semi-skilled / Unskilled (align seed + DPR counts)  
8. Attendance: check-in / check-out / OT / shift + daily deployment rolled into DPR  

### Equipment

9. Equipment master, allocation, fuel, maintenance, breakdown, utilization (today: DPR free-text hours only)  

### Material consumption

10. DPR material lines → Material Issue confirm → Stock Ledger → Project Cost (no manual stock edit)  
11. Prefer reservations (`sourceType: dpr`) → issue confirm on approve  

### Work measurement

12. Measurement sheet → engineer verify → approve; link to DPR + BOQ; drawing register ref  

### Site diary / quality / safety / issues / drawings / photos

13. First-class modules as listed in Phase 5 brief (diary, quality NCR/punch, HSE, issues workflow, drawing revisions, geo photo album)  

### Mobile

14. Site engineer offline path: create DPR, scan materials, labour, equipment, photos, measurements, submit — extend existing enqueue; wire new entities  

### Dashboards & reports

15. PM: DPR completion, labour, equipment, material, delays, issues  
16. Director: physical progress, financial progress, daily productivity, critical issues  
17. Reports: DPR register, labour, equipment utilization, material consumption, daily progress, delay, quality, safety, productivity  

## Security baseline

Reuse IAM + project/site assignment + inventory/procurement permissions + R-003 `@ProjectScoped`.  
Extend permission catalog only where a new capability has no existing verb (e.g. equipment, HSE, drawings, site issues).  
Do **not** duplicate `stock.*`, `dpr.*`, `measurement.*`, `attendance.*`, `quality.*` (GRN), `document.*`, `site.*`.

## Recommended build order (waves)

| Wave | Focus | Outcome |
|------|--------|---------|
| **W1** | Site-scoped DPR + workflow + location/shift | DPR becomes multi-site daily engine shell |
| **W2** | DPR ↔ Material Issue / Reservation / Ledger | Cement bags on DPR actually reduce stock + cost |
| **W3** | Labour deployment + attendance OT/shift → DPR | Daily labour rollup is transactional |
| **W4** | Work measurement link + progress % | BOQ progress driven from certified measures / DPR |
| **W5** | Site issues + diary + photos (geo/version) | Operational log + issue workflow |
| **W6** | Quality (site) + Safety (HSE) | Separate from GRN QC |
| **W7** | Equipment master + utilization | Replace free-text equipment |
| **W8** | Drawing register | Revisions / supersede / site access |
| **W9** | Dashboards + reports + mobile polish | PM/Director surfaces + offline completeness |
